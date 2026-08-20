# MedSigLIP production artifacts

This directory holds **inference artifacts** exported from `training/` (not the training code itself).

## Files

| File | Purpose | In git? |
|------|---------|---------|
| `postcare_config.json` | Label order, base model, version metadata | Yes |
| `thresholds.json` | Per-label Youden's J thresholds from validation | Yes (update after training) |
| `config.json` | HuggingFace model config (from export) | Yes (auto from export) |
| `best_model.pt` | Fine-tuned weights (optional single-file export) | No (large) |
| `model.safetensors` / `pytorch_model.bin` | Full HuggingFace checkpoint | No (large) |

## Export from training (Run 2)

After `python training/train.py --config training/configs/run2_best.yaml`:

```bash
python training/scripts/export_production_model.py
```

This copies the best checkpoint and tuned thresholds from `training/outputs/medsiglip-448-surgwound-v2/` into this folder.

## MLOps lineage

- **Run 1** (`run1_underfitting.yaml`) — baseline experiment, underfitting documented
- **Run 2** (`run2_best.yaml`) — production model promoted here as `postcare-medsiglip-v1`

See `training/experiments/EXPERIMENT_LOG.md` and MLflow runs under `training/mlruns/`.
