#!/usr/bin/env python3
"""Execute Run 1 then Run 2 to preserve experiment lineage in MLflow."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run_step(config_path: Path, extra_args: list[str]) -> None:
    cmd = [sys.executable, str(Path(__file__).resolve().parent.parent / "train.py"), "--config", str(config_path), *extra_args]
    print(f"\n>>> {' '.join(cmd)}\n")
    subprocess.check_call(cmd)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run MedSigLIP experiment lineage (Run 1 -> Run 2)")
    parser.add_argument("--dataset-path", default=None)
    parser.add_argument("--skip-run1", action="store_true", help="Only run Run 2 (Run 1 already completed)")
    args, extra = parser.parse_known_args()

    root = Path(__file__).resolve().parent.parent
    run1 = root / "configs" / "run1_underfitting.yaml"
    run2 = root / "configs" / "run2_best.yaml"

    shared: list[str] = []
    if args.dataset_path:
        shared.extend(["--dataset-path", args.dataset_path])
    shared.extend(extra)

    if not args.skip_run1:
        print("=" * 72)
        print("STEP 1/2 — Run 1 baseline (expected underfitting)")
        print("=" * 72)
        run_step(run1, shared)

    print("=" * 72)
    print("STEP 2/2 — Run 2 best config (links to Run 1 in MLflow)")
    print("=" * 72)
    run_step(run2, shared)

    print("\nExperiment lineage complete.")
    print(f"View runs: mlflow ui --backend-store-uri {root / 'mlruns'}")


if __name__ == "__main__":
    main()
