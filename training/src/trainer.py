"""Custom Hugging Face Trainer with masked BCE and differential LR."""

from __future__ import annotations

import torch
from transformers import Trainer, TrainingArguments

from .config import ExperimentConfig
from .losses import masked_bce_loss


class WoundClassificationTrainer(Trainer):
    def __init__(self, cfg: ExperimentConfig, pos_weight: torch.Tensor, *args, **kwargs):
        self.cfg = cfg
        self.pos_weight = pos_weight
        super().__init__(*args, **kwargs)

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        loss = masked_bce_loss(outputs, labels, self.pos_weight)
        return (loss, outputs) if return_outputs else loss

    def create_optimizer(self):
        cfg = self.cfg.training
        no_decay = {"bias", "layer_norm.weight", "LayerNorm.weight"}
        head_params = list(self.model.classifier.parameters())
        head_ids = {id(p) for p in head_params}

        if cfg.differential_lr:
            backbone_decay, backbone_nodecay = [], []
            for name, param in self.model.named_parameters():
                if not param.requires_grad or id(param) in head_ids:
                    continue
                if any(nd in name for nd in no_decay):
                    backbone_nodecay.append(param)
                else:
                    backbone_decay.append(param)

            param_groups = [
                {
                    "params": backbone_decay,
                    "lr": cfg.backbone_lr,
                    "weight_decay": cfg.weight_decay,
                },
                {
                    "params": backbone_nodecay,
                    "lr": cfg.backbone_lr,
                    "weight_decay": 0.0,
                },
                {
                    "params": head_params,
                    "lr": cfg.head_lr,
                    "weight_decay": cfg.weight_decay,
                },
            ]
        else:
            decay, nodecay = [], []
            for name, param in self.model.named_parameters():
                if not param.requires_grad:
                    continue
                if any(nd in name for nd in no_decay):
                    nodecay.append(param)
                else:
                    decay.append(param)

            lr = cfg.learning_rate
            param_groups = [
                {"params": decay, "lr": lr, "weight_decay": cfg.weight_decay},
                {"params": nodecay, "lr": lr, "weight_decay": 0.0},
            ]

        self.optimizer = torch.optim.AdamW(param_groups)
        return self.optimizer


def build_training_arguments(cfg: ExperimentConfig, output_dir: str) -> TrainingArguments:
    t = cfg.training
    return TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=t.epochs,
        per_device_train_batch_size=t.batch_size,
        per_device_eval_batch_size=t.batch_size * 2,
        gradient_accumulation_steps=t.grad_accum,
        learning_rate=t.learning_rate,
        weight_decay=t.weight_decay,
        warmup_steps=t.warmup_steps,
        lr_scheduler_type=t.scheduler,
        fp16=t.fp16 and torch.cuda.is_available(),
        logging_steps=t.logging_steps,
        save_strategy="epoch",
        eval_strategy="epoch",
        metric_for_best_model=t.metric_for_best_model,
        greater_is_better=False,
        load_best_model_at_end=True,
        report_to=["tensorboard", "mlflow"],
        push_to_hub=False,
        remove_unused_columns=False,
        dataloader_num_workers=t.dataloader_num_workers,
        save_total_limit=t.save_total_limit,
        run_name=cfg.run.name,
    )
