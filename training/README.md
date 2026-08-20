# MedSigLIP SurgWound Fine-Tuning

Production training script converted from the Kaggle notebook `medsiglip-finetuning.ipynb`.
Implements MLOps practices with versioned YAML configs, MLflow tracking, and an explicit
**Run 1 (underfitting baseline) -> Run 2 (best)** experiment lineage.

## What This Trains

Fine-tunes [`google/medsiglip-448`](https://huggingface.co/google/medsiglip-448) on the
[SurgWound dataset](https://huggingface.co/datasets/xuxuxuxuxu/SurgWound) for six binary
clinical labels:

- healing status
- erythema
- edema
- infection risk
- urgency
- exudate

## Project Layout

```
training/
├── configs/
│   ├── run1_underfitting.yaml   # Baseline experiment (40 optimizer steps)
│   └── run2_best.yaml           # Best run (300 steps, differential LR, Youden thresholds)
├── experiments/
│   └── EXPERIMENT_LOG.md        # Run 1 -> Run 2 rationale and comparison table
├── scripts/
│   └── run_experiment_lineage.py
├── src/                         # Modular training code
├── train.py                     # Main entrypoint
├── requirements.txt
└── mlruns/                      # Created after first run (MLflow tracking)
```

## Quick Start

### 1. Install dependencies

```bash
cd training
pip install -r requirements.txt
```

### 2. Prepare data and auth

- Accept the MedSigLIP license on Hugging Face
- Set `HF_TOKEN` (or Kaggle secret `PostCare` / `HF_TOKEN`)
- Place SurgWound at one of:
  - `/kaggle/input/surgwound-dataset`
  - `./data/surgwound` (must contain `labels.csv` and `images/`)

Optional override:

```bash
export DATASET_PATH=/path/to/surgwound-dataset
```

### 3. Run experiments (recommended order)

```bash
# Runs Run 1 first, then Run 2 with MLflow lineage tags
python scripts/run_experiment_lineage.py
```

Or run configs individually:

```bash
python train.py --config configs/run1_underfitting.yaml
python train.py --config configs/run2_best.yaml
```

### 4. Inspect results

```bash
mlflow ui --backend-store-uri ./mlruns
```

Outputs:

| Run | Directory | Notes |
|-----|-----------|-------|
| Run 1 | `outputs/medsiglip-448-surgwound-v1/` | Underfitting baseline, fixed threshold 0.5 |
| Run 2 | `outputs/medsiglip-448-surgwound-v2/` | Best model, per-label Youden thresholds |

## MLOps Features

- **Reproducible configs**: all hyperparameters in YAML, logged to MLflow
- **Experiment lineage**: Run 2 references Run 1 via `parent_run` + MLflow tags
- **Dual logging**: TensorBoard (`output_dir/runs`) + MLflow metrics/artifacts
- **Checkpoint selection**: best model by `eval_loss` (stable on small val set)
- **Post-training calibration**: Run 2 tunes per-label thresholds on validation only
- **Run metadata**: `run_metadata.json`, `metrics.json`, `thresholds.json` per output dir

## Key Design (from notebook)

- Selective freezing: last N encoder blocks + head trainable
- Masked BCE loss for MISSING labels (erythema, edema, exudate)
- Class imbalance via precomputed `pos_weight`
- Light augmentation: flip, rotation, brightness/contrast jitter
- No torchvision dependency (Kaggle PIL compatibility)

## CLI Options

```bash
python train.py --config configs/run2_best.yaml \
  --dataset-path ./data/surgwound \
  --output-dir outputs/custom-run \
  --parent-run-id <mlflow_run_id>
```

See `experiments/EXPERIMENT_LOG.md` for the full Run 1 vs Run 2 comparison.
