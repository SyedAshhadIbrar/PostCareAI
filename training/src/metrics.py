"""Evaluation metrics and threshold tuning."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import roc_auc_score

from .config import LABEL_NAMES


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-x))


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    scores = sigmoid(logits)

    results: dict[str, float] = {}
    per_label_auc: list[float] = []

    for i, name in enumerate(LABEL_NAMES):
        valid_mask = labels[:, i] >= 0
        if valid_mask.sum() == 0:
            continue

        y_true = labels[valid_mask, i]
        y_score = scores[valid_mask, i]

        if len(np.unique(y_true)) < 2:
            results[f"auc_{name}"] = float("nan")
            continue

        try:
            auc = roc_auc_score(y_true, y_score)
            per_label_auc.append(auc)
            results[f"auc_{name}"] = auc
        except ValueError:
            results[f"auc_{name}"] = float("nan")

    results["roc_auc_macro"] = float(np.mean(per_label_auc)) if per_label_auc else float("nan")
    return results


def _sens_spec(y_true: np.ndarray, y_pred: np.ndarray) -> tuple[float, float]:
    tp = ((y_pred == 1) & (y_true == 1)).sum()
    tn = ((y_pred == 0) & (y_true == 0)).sum()
    fn = ((y_pred == 0) & (y_true == 1)).sum()
    fp = ((y_pred == 1) & (y_true == 0)).sum()
    sens = tp / (tp + fn) if (tp + fn) > 0 else float("nan")
    spec = tn / (tn + fp) if (tn + fp) > 0 else float("nan")
    return float(sens), float(spec)


def compute_full_metrics(logits: np.ndarray, labels: np.ndarray, thresholds: dict[str, float]) -> dict[str, float]:
    scores = sigmoid(logits)
    results: dict[str, float] = {}
    all_aucs: list[float] = []

    for i, name in enumerate(LABEL_NAMES):
        valid_mask = labels[:, i] >= 0
        y_true = labels[valid_mask, i]
        y_score = scores[valid_mask, i]
        thresh = thresholds.get(name, 0.5)
        y_pred = (y_score > thresh).astype(int)

        try:
            auc = roc_auc_score(y_true, y_score) if len(np.unique(y_true)) >= 2 else float("nan")
        except ValueError:
            auc = float("nan")

        sens, spec = _sens_spec(y_true, y_pred)
        if not np.isnan(auc):
            all_aucs.append(auc)

        results[f"auc_{name}"] = float(auc)
        results[f"sens_{name}"] = sens
        results[f"spec_{name}"] = spec
        results[f"threshold_{name}"] = float(thresh)

    results["roc_auc_macro"] = float(np.mean(all_aucs)) if all_aucs else float("nan")
    return results


def tune_youden_thresholds(
    val_logits: np.ndarray,
    val_labels: np.ndarray,
    grid_start: float = 0.10,
    grid_stop: float = 0.91,
    grid_step: float = 0.01,
) -> dict[str, float]:
    val_scores = sigmoid(val_logits)
    threshold_grid = np.arange(grid_start, grid_stop, grid_step)
    thresholds: dict[str, float] = {}

    for i, name in enumerate(LABEL_NAMES):
        valid_mask = val_labels[:, i] >= 0
        y_true = val_labels[valid_mask, i]
        y_score = val_scores[valid_mask, i]

        y_pred05 = (y_score > 0.5).astype(int)
        sens05, spec05 = _sens_spec(y_true, y_pred05)
        best_j = sens05 + spec05 - 1.0
        best_thresh = 0.5

        for thresh in threshold_grid:
            y_pred = (y_score > thresh).astype(int)
            sens, spec = _sens_spec(y_true, y_pred)
            j = sens + spec - 1.0
            if j > best_j:
                best_j = j
                best_thresh = float(thresh)

        thresholds[name] = round(best_thresh, 2)

    return thresholds


def fixed_thresholds(threshold: float = 0.5) -> dict[str, float]:
    return {name: threshold for name in LABEL_NAMES}


def save_thresholds(thresholds: dict[str, float], output_dir: str) -> Path:
    path = Path(output_dir) / "thresholds.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(thresholds, indent=2), encoding="utf-8")
    return path
