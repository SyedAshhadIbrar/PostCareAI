"""Model loading and selective freezing."""

from __future__ import annotations

import torch
from transformers import AutoModelForImageClassification

from .config import ExperimentConfig


def load_frozen_model(cfg: ExperimentConfig, device: str) -> AutoModelForImageClassification:
    model = AutoModelForImageClassification.from_pretrained(
        cfg.model.id,
        problem_type="multi_label_classification",
        num_labels=cfg.num_labels,
        id2label=cfg.id2label,
        label2id=cfg.label2id,
        ignore_mismatched_sizes=True,
    )

    for param in model.parameters():
        param.requires_grad = False

    for param in model.classifier.parameters():
        param.requires_grad = True

    encoder_layers = model.vision_model.encoder.layers
    n_unfreeze = cfg.model.n_unfreeze
    for layer in encoder_layers[-n_unfreeze:]:
        for param in layer.parameters():
            param.requires_grad = True

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(
        f"Parameters: total={total_params:,} trainable={trainable_params:,} "
        f"({100 * trainable_params / total_params:.1f}%)"
    )

    return model.to(device)


def auto_tune_batch_for_gpu(batch_size: int, grad_accum: int) -> tuple[int, int]:
    if not torch.cuda.is_available():
        return batch_size, grad_accum

    gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1e9
    if gpu_mem >= 30:
        return 16, 1
    return batch_size, grad_accum
