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
| `N_UNFREEZE` | 4 | **8** | ~2× trainable capacity (~14% → ~28%) |
| `GRAD_ACCUM` | 16 | **4** | 8 → 30 optimizer steps/epoch |
| `EPOCHS` | 5 | **10** | 40 → **300** total optimizer steps (7.5×) |
| Learning rate | single 5e-5 | **differential** backbone=1.5e-5 / head=8e-5 | Preserves pretrained features, fast head convergence |
| Threshold | fixed 0.5 | **per-label (Youden's J)** | Corrects miscalibration (e.g., healing sens=0.84/spec=0.26) |

### Key design decisions

- **Expanded selective freezing**: Last **8** encoder blocks + classification head are trainable (~28% of params); deeper layers give the model more expressive capacity without saturating T4 VRAM
- **Differential learning rate**: Backbone blocks update at `BACKBONE_LR=1.5e-5` (gentle, preserves pretrained SigLIP features); classifier head at `HEAD_LR=8e-5` (fast learning from random initialization)
- **Masked BCE loss**: 3 of 6 labels have MISSING values — loss is zeroed out for those entries instead of dropping entire samples
- **Light augmentation**: Horizontal flip + rotation + color jitter to compensate for small dataset (480 train images)
- **eval_loss for model selection**: Val set has only 69 images — per-label AUC too noisy for checkpoint comparison
- **Per-label threshold tuning**: Youden's J (J = sensitivity + specificity − 1) on validation set replaces a fixed threshold=0.5 after training

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
