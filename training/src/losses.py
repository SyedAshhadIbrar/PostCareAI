"""Masked BCE loss for multi-label wound classification."""

from __future__ import annotations

import torch
from torch.nn import BCEWithLogitsLoss


def masked_bce_loss(outputs: dict, labels: torch.Tensor, pos_weight: torch.Tensor) -> torch.Tensor:
    logits = outputs.get("logits")
    mask = (labels >= 0).float()
    safe_labels = labels.clamp(min=0.0)

    pos_weight = pos_weight.to(logits.device)
    loss_fct = BCEWithLogitsLoss(pos_weight=pos_weight, reduction="none")
    per_element_loss = loss_fct(logits, safe_labels)
    masked_loss = per_element_loss * mask

    num_valid = mask.sum()
    if num_valid == 0:
        return torch.tensor(0.0, device=logits.device, requires_grad=True)

    return masked_loss.sum() / num_valid
