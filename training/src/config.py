"""Training configuration loading and validation."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


LABEL_NAMES = [
    "healing_status",
    "erythema",
    "edema",
    "infection_risk",
    "urgency",
    "exudate",
]


@dataclass
class RunConfig:
    name: str
    description: str
    parent_run: str | None
    output_dir: str
    tags: dict[str, str] = field(default_factory=dict)


@dataclass
class ModelConfig:
    id: str
    n_unfreeze: int


@dataclass
class DataConfig:
    dataset_name: str
    expected_splits: dict[str, int]
    pos_weight: list[float]
    base_path: str | None = None


@dataclass
class TrainingConfig:
    batch_size: int
    grad_accum: int
    epochs: int
    differential_lr: bool
    learning_rate: float | None = None
    backbone_lr: float | None = None
    head_lr: float | None = None
    warmup_steps: int = 10
    weight_decay: float = 0.01
    scheduler: str = "cosine"
    fp16: bool = True
    logging_steps: int = 1
    save_total_limit: int = 3
    dataloader_num_workers: int = 2
    metric_for_best_model: str = "eval_loss"


@dataclass
class EvaluationConfig:
    threshold_strategy: str = "fixed"
    fixed_threshold: float = 0.5
    threshold_grid: dict[str, float] | None = None


@dataclass
class MLflowConfig:
    experiment_name: str = "medsiglip-surgwound"
    tracking_uri: str = "./mlruns"


@dataclass
class ExperimentConfig:
    run: RunConfig
    model: ModelConfig
    data: DataConfig
    training: TrainingConfig
    evaluation: EvaluationConfig
    mlflow: MLflowConfig
    raw: dict[str, Any] = field(default_factory=dict, repr=False)

    @property
    def num_labels(self) -> int:
        return len(LABEL_NAMES)

    @property
    def id2label(self) -> dict[int, str]:
        return {i: name for i, name in enumerate(LABEL_NAMES)}

    @property
    def label2id(self) -> dict[str, int]:
        return {name: i for i, name in enumerate(LABEL_NAMES)}


def resolve_dataset_path(explicit_path: str | None = None) -> str:
    """Resolve SurgWound dataset root across Kaggle, local, and CLI override."""
    candidates: list[str] = []
    if explicit_path:
        candidates.append(explicit_path)

    candidates.extend(
        [
            "/kaggle/input/datasets/kkfkmf/surgwound-dataset",
            "/kaggle/input/surgwound-dataset",
            "/kaggle/input/surgwound",
            "./data/surgwound",
        ]
    )

    for path in candidates:
        labels_csv = os.path.join(path, "labels.csv")
        if os.path.isfile(labels_csv):
            return path

    raise FileNotFoundError(
        "SurgWound dataset not found. Set DATASET_PATH or place data under ./data/surgwound"
    )


def load_config(config_path: str | Path, dataset_path: str | None = None) -> ExperimentConfig:
    path = Path(config_path)
    with path.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    data_cfg = raw["data"]
    data_cfg["base_path"] = resolve_dataset_path(dataset_path or os.environ.get("DATASET_PATH"))

    training_raw = raw["training"]
    training = TrainingConfig(**training_raw)

    if training.differential_lr:
        if training.backbone_lr is None or training.head_lr is None:
            raise ValueError("differential_lr=true requires backbone_lr and head_lr")
        effective_lr = training.head_lr
    else:
        if training.learning_rate is None:
            raise ValueError("differential_lr=false requires learning_rate")
        effective_lr = training.learning_rate

    training.learning_rate = effective_lr

    return ExperimentConfig(
        run=RunConfig(**raw["run"]),
        model=ModelConfig(**raw["model"]),
        data=DataConfig(**data_cfg),
        training=training,
        evaluation=EvaluationConfig(**raw.get("evaluation", {})),
        mlflow=MLflowConfig(**raw.get("mlflow", {})),
        raw=raw,
    )


def compute_step_counts(num_train_samples: int, batch_size: int, grad_accum: int, epochs: int) -> dict[str, int]:
    forward_passes = (num_train_samples + batch_size - 1) // batch_size
    optimizer_steps = (forward_passes + grad_accum - 1) // grad_accum
    total_steps = epochs * optimizer_steps
    return {
        "forward_passes_per_epoch": forward_passes,
        "optimizer_steps_per_epoch": optimizer_steps,
        "total_optimizer_steps": total_steps,
        "effective_batch_size": batch_size * grad_accum,
    }
