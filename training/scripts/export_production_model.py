#!/usr/bin/env python3
"""Promote Run 2 training outputs to models/medsiglip/ for production inference."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export MedSigLIP artifacts for PostCare API")
    parser.add_argument(
        "--training-output",
        default="training/outputs/medsiglip-448-surgwound-v2",
        help="Directory from training/train.py Run 2",
    )
    parser.add_argument(
        "--dest",
        default="models/medsiglip",
        help="Production model directory consumed by backend/services/wound_model.py",
    )
    args = parser.parse_args()

    src = Path(args.training_output)
    dest = Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)

    if not src.exists():
        raise FileNotFoundError(
            f"Training output not found: {src}\n"
            "Run: python training/train.py --config training/configs/run2_best.yaml"
        )

    # Copy HuggingFace checkpoint files
    for name in (
        "config.json",
        "model.safetensors",
        "pytorch_model.bin",
        "preprocessor_config.json",
    ):
        src_file = src / name
        if src_file.exists():
            shutil.copy2(src_file, dest / name)
            print(f"Copied {name}")

    # Merge PostCare metadata (separate from HuggingFace config.json)
    postcare_config_path = dest / "postcare_config.json"
    if postcare_config_path.exists():
        cfg = json.loads(postcare_config_path.read_text(encoding="utf-8"))
    else:
        cfg = {}

    cfg.update(
        {
            "base_model": "google/medsiglip-448",
            "num_labels": 6,
            "labels": [
                "healing_status",
                "erythema",
                "edema",
                "infection_risk",
                "urgency",
                "exudate",
            ],
            "image_size": 448,
            "unfrozen_blocks": 8,
            "model_version": "postcare-medsiglip-v1",
            "training_run": "run2-best",
            "training_config": "training/configs/run2_best.yaml",
            "threshold_strategy": "youden_j",
        }
    )
    postcare_config_path.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    print(f"Updated {postcare_config_path}")

    # Copy tuned thresholds from training evaluation
    thresholds_src = src / "thresholds.json"
    if thresholds_src.exists():
        shutil.copy2(thresholds_src, dest / "thresholds.json")
        print("Copied thresholds.json")
    else:
        print("Warning: thresholds.json not found in training output — keeping existing dest file")

    # Optional single-file weight export for deployment tools expecting .pt
    weight_src = src / "pytorch_model.bin"
    if not weight_src.exists():
        weight_src = src / "model.safetensors"
    if weight_src.exists():
        print(f"Weights available at {dest / weight_src.name}")
        print("Note: best_model.pt is optional; wound_model.py loads HF checkpoint directly.")

    print(f"\nExport complete → {dest.resolve()}")
    print("Restart API: uvicorn backend.main:app --reload")


if __name__ == "__main__":
    main()
