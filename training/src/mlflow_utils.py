"""MLflow experiment tracking and run lineage."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import mlflow
from mlflow.tracking import MlflowClient

from .config import ExperimentConfig


def setup_mlflow(cfg: ExperimentConfig) -> None:
    mlflow.set_tracking_uri(cfg.mlflow.tracking_uri)
    mlflow.set_experiment(cfg.mlflow.experiment_name)


def find_parent_run_id(parent_run_name: str | None, experiment_name: str) -> str | None:
    if not parent_run_name:
        return None

    client = MlflowClient()
    experiment = client.get_experiment_by_name(experiment_name)
    if experiment is None:
        return None

    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string=f"tags.mlflow.runName = '{parent_run_name}'",
        order_by=["start_time DESC"],
        max_results=1,
    )
    return runs[0].info.run_id if runs else None


def start_run(cfg: ExperimentConfig, config_path: str, parent_run_id: str | None = None):
    tags = {
        "run_stage": cfg.run.tags.get("stage", "unknown"),
        "run_outcome": cfg.run.tags.get("outcome", "unknown"),
        "config_file": Path(config_path).name,
    }
    if cfg.run.parent_run:
        tags["parent_run_name"] = cfg.run.parent_run
    if parent_run_id:
        tags["mlflow.parentRunId"] = parent_run_id
    tags.update(cfg.run.tags)

    return mlflow.start_run(run_name=cfg.run.name, tags=tags)


def log_config_snapshot(cfg: ExperimentConfig, config_path: str) -> None:
    mlflow.log_param("model_id", cfg.model.id)
    mlflow.log_param("n_unfreeze", cfg.model.n_unfreeze)
    mlflow.log_param("batch_size", cfg.training.batch_size)
    mlflow.log_param("grad_accum", cfg.training.grad_accum)
    mlflow.log_param("epochs", cfg.training.epochs)
    mlflow.log_param("differential_lr", cfg.training.differential_lr)
    mlflow.log_param("warmup_steps", cfg.training.warmup_steps)
    mlflow.log_param("weight_decay", cfg.training.weight_decay)
    mlflow.log_param("threshold_strategy", cfg.evaluation.threshold_strategy)

    if cfg.training.differential_lr:
        mlflow.log_param("backbone_lr", cfg.training.backbone_lr)
        mlflow.log_param("head_lr", cfg.training.head_lr)
    else:
        mlflow.log_param("learning_rate", cfg.training.learning_rate)

    if cfg.run.parent_run:
        mlflow.set_tag("parent_run_name", cfg.run.parent_run)

    mlflow.log_text(json.dumps(cfg.raw, indent=2), artifact_file="config/resolved_config.json")
    shutil.copy2(config_path, Path("resolved_config.yaml"))
    mlflow.log_artifact("resolved_config.yaml", artifact_path="config")
    Path("resolved_config.yaml").unlink(missing_ok=True)


def log_step_plan(step_counts: dict[str, int]) -> None:
    for key, value in step_counts.items():
        mlflow.log_param(key, value)


def log_metrics_dict(metrics: dict[str, float], prefix: str = "") -> None:
    for key, value in metrics.items():
        if value is None or (isinstance(value, float) and value != value):
            continue
        mlflow.log_metric(f"{prefix}{key}", float(value))


def log_artifacts(output_dir: str) -> None:
    thresholds = Path(output_dir) / "thresholds.json"
    if thresholds.exists():
        mlflow.log_artifact(str(thresholds), artifact_path="evaluation")

    metrics_path = Path(output_dir) / "metrics.json"
    if metrics_path.exists():
        mlflow.log_artifact(str(metrics_path), artifact_path="evaluation")


def save_run_metadata(output_dir: str, metadata: dict[str, Any]) -> None:
    path = Path(output_dir) / "run_metadata.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
