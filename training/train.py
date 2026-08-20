#!/usr/bin/env python3
"""
Fine-tune google/medsiglip-448 on SurgWound with MLOps experiment tracking.

Run 1 (underfitting baseline) should be executed before Run 2 so MLflow captures
the experiment lineage: run1-underfitting-baseline -> run2-best.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import mlflow
import numpy as np
import torch

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from src.config import compute_step_counts, load_config
from src.data import collate_fn, load_datasets
from src.env import disable_torchvision_in_transformers, login_hf, resolve_hf_token, setup_cuda
from src.metrics import (
    compute_full_metrics,
    compute_metrics,
    fixed_thresholds,
    save_thresholds,
    tune_youden_thresholds,
)
from src.mlflow_utils import (
    find_parent_run_id,
    log_artifacts,
    log_config_snapshot,
    log_metrics_dict,
    log_step_plan,
    save_run_metadata,
    setup_mlflow,
    start_run,
)
from src.model import auto_tune_batch_for_gpu, load_frozen_model
from src.trainer import WoundClassificationTrainer, build_training_arguments
from src.transforms import ImagePreprocessor


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MedSigLIP SurgWound fine-tuning")
    parser.add_argument(
        "--config",
        required=True,
        help="Path to YAML config (configs/run1_underfitting.yaml or configs/run2_best.yaml)",
    )
    parser.add_argument(
        "--dataset-path",
        default=os.environ.get("DATASET_PATH"),
        help="Override SurgWound dataset root (default: auto-detect or DATASET_PATH env)",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Override output directory from config",
    )
    parser.add_argument(
        "--parent-run-id",
        default=None,
        help="Optional MLflow parent run ID for explicit lineage linking",
    )
    parser.add_argument(
        "--skip-train",
        action="store_true",
        help="Skip training (evaluation-only smoke test)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cfg = load_config(args.config, dataset_path=args.dataset_path)

    if args.output_dir:
        cfg.run.output_dir = args.output_dir

    setup_cuda()
    disable_torchvision_in_transformers()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        cfg.training.fp16 = False
        print("Warning: training on CPU will be extremely slow")

    batch_size, grad_accum = auto_tune_batch_for_gpu(cfg.training.batch_size, cfg.training.grad_accum)
    cfg.training.batch_size = batch_size
    cfg.training.grad_accum = grad_accum

    output_dir = Path(cfg.run.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Run: {cfg.run.name}")
    print(f"Description: {cfg.run.description.strip()}")
    if cfg.run.parent_run:
        print(f"Parent experiment: {cfg.run.parent_run}")

    _, train_ds_raw, val_ds_raw, test_ds_raw = load_datasets(cfg)
    step_counts = compute_step_counts(
        len(train_ds_raw),
        cfg.training.batch_size,
        cfg.training.grad_accum,
        cfg.training.epochs,
    )
    print(f"Step plan: {step_counts}")

    hf_token = resolve_hf_token()
    login_hf(hf_token)

    preprocessor = ImagePreprocessor(cfg.model.id, hf_token=hf_token)
    train_ds, val_ds, test_ds = preprocessor.apply(train_ds_raw, val_ds_raw, test_ds_raw)

    pos_weight = torch.tensor(cfg.data.pos_weight, dtype=torch.float)
    model = load_frozen_model(cfg, device)

    setup_mlflow(cfg)
    parent_run_id = args.parent_run_id or find_parent_run_id(
        cfg.run.parent_run,
        cfg.mlflow.experiment_name,
    )

    with start_run(cfg, args.config, parent_run_id=parent_run_id):
        log_config_snapshot(cfg, args.config)
        log_step_plan(step_counts)
        mlflow.log_param("dataset_path", cfg.data.base_path)

        training_args = build_training_arguments(cfg, str(output_dir))
        trainer = WoundClassificationTrainer(
            cfg=cfg,
            pos_weight=pos_weight,
            model=model,
            args=training_args,
            train_dataset=train_ds,
            eval_dataset=val_ds,
            data_collator=collate_fn,
            compute_metrics=compute_metrics,
        )

        train_metrics: dict[str, float] = {}
        if not args.skip_train:
            print("Starting training...")
            start = time.time()
            train_result = trainer.train()
            elapsed_min = (time.time() - start) / 60.0

            train_metrics = {
                "train_loss": float(train_result.training_loss),
                "train_runtime_minutes": elapsed_min,
            }
            log_metrics_dict(train_metrics)

            if np.isnan(train_result.training_loss):
                raise RuntimeError("Training loss is NaN — try FP16=false")

            print(f"Training complete in {elapsed_min:.1f} min")
            print(f"Best checkpoint: {trainer.state.best_model_checkpoint}")

        print("Evaluating validation set for threshold selection...")
        val_preds = trainer.predict(val_ds)
        val_logits = val_preds.predictions
        val_labels = val_preds.label_ids

        if cfg.evaluation.threshold_strategy == "youden_j":
            grid = cfg.evaluation.threshold_grid or {}
            thresholds = tune_youden_thresholds(
                val_logits,
                val_labels,
                grid_start=grid.get("start", 0.10),
                grid_stop=grid.get("stop", 0.91),
                grid_step=grid.get("step", 0.01),
            )
        else:
            thresholds = fixed_thresholds(cfg.evaluation.fixed_threshold)

        threshold_path = save_thresholds(thresholds, str(output_dir))
        print(f"Thresholds saved to {threshold_path}")
        for name, value in thresholds.items():
            mlflow.log_param(f"threshold_{name}", value)

        print("Evaluating test set...")
        test_preds = trainer.predict(test_ds)
        test_metrics = compute_full_metrics(test_preds.predictions, test_preds.label_ids, thresholds)
        log_metrics_dict(test_metrics, prefix="test_")

        metrics_path = output_dir / "metrics.json"
        metrics_path.write_text(
            json.dumps(
                {
                    "run_name": cfg.run.name,
                    "parent_run": cfg.run.parent_run,
                    "step_counts": step_counts,
                    "thresholds": thresholds,
                    "train": train_metrics,
                    "test": test_metrics,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        trainer.save_model(str(output_dir))
        preprocessor.save_pretrained(str(output_dir))

        save_run_metadata(
            str(output_dir),
            {
                "run_name": cfg.run.name,
                "description": cfg.run.description.strip(),
                "parent_run": cfg.run.parent_run,
                "config_path": str(Path(args.config).resolve()),
                "mlflow_run_id": mlflow.active_run().info.run_id,
                "best_checkpoint": trainer.state.best_model_checkpoint,
            },
        )

        log_artifacts(str(output_dir))

        print(f"\nTest macro AUC: {test_metrics['roc_auc_macro']:.4f}")
        print(f"Artifacts: {output_dir.resolve()}")
        print(f"MLflow run ID: {mlflow.active_run().info.run_id}")


if __name__ == "__main__":
    main()
