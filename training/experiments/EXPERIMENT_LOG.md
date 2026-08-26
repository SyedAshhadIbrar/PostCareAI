# MedSigLIP SurgWound Experiment Log

This file documents the intentional two-run experiment sequence used to fine-tune
`google/medsiglip-448` for PostCareAI wound assessment.

## Pipeline Context

```
Wound photo -> MedSigLIP (this model) -> structured scores -> Gemini/MedGemma orchestrator -> empathetic response
```

## Experiment Sequence

| Order | Run name | Config | Purpose |
|------:|----------|--------|---------|
| 1 | `run1-underfitting-baseline` | `configs/run1_underfitting.yaml` | Baseline with limited capacity/steps; confirmed underfitting |
| 2 | `run2-best` | `configs/run2_best.yaml` | Production config; explicitly supersedes Run 1 |

Run 2 declares `parent_run: run1-underfitting-baseline` in its YAML config. MLflow stores
this lineage via `parent_run_name` and `mlflow.parentRunId` tags when Run 1 exists.

## Run 1 -> Run 2 Changes

| Parameter | Run 1 | Run 2 | Effect |
|---|---|---|---|
| `N_UNFREEZE` | 4 | **8** | ~2x trainable capacity (~14% -> ~28%) |
| `GRAD_ACCUM` | 16 | **4** | 8 -> 30 optimizer steps/epoch |
| `EPOCHS` | 5 | **10** | 40 -> **300** total optimizer steps (7.5x) |
| Learning rate | single 5e-5 | **differential** backbone=1.5e-5 / head=8e-5 | Preserve pretrained features, faster head learning |
| Threshold | fixed 0.5 | **per-label Youden's J** | Corrects miscalibration |

## Run 1 Observations (Why Run 2 Was Needed)

- Inference scores clustered around 0.45-0.59
- Validation loss still decreasing at epoch 5 (no plateau)
- Only 40 optimizer steps total — insufficient for 6 imbalanced labels on 480 images

## Artifacts Per Run

Each run writes to its own output directory:

- `outputs/medsiglip-448-surgwound-v1/` (Run 1)
- `outputs/medsiglip-448-surgwound-v2/` (Run 2)

Artifacts include:

- Fine-tuned model + image processor
- `thresholds.json` (fixed 0.5 for Run 1, tuned for Run 2)
- `metrics.json` and `run_metadata.json`
- MLflow params/metrics under `./mlruns`

## Reproduce

```bash
cd training
pip install -r requirements.txt
export HF_TOKEN=...           # required for gated google/medsiglip-448
export DATASET_PATH=./data/surgwound   # or Kaggle mount path

# Full lineage (Run 1 then Run 2)
python scripts/run_experiment_lineage.py

# Or individually
python train.py --config configs/run1_underfitting.yaml
python train.py --config configs/run2_best.yaml
```

View tracked experiments:

```bash
mlflow ui --backend-store-uri ./mlruns
```
