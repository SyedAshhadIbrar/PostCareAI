"""Image preprocessing without torchvision."""

from __future__ import annotations

import random

import numpy as np
import torch
from PIL import Image as PILImage, ImageEnhance
from transformers import AutoImageProcessor


class ImagePreprocessor:
    def __init__(self, model_id: str, hf_token: str | None = None):
        self.image_processor = AutoImageProcessor.from_pretrained(model_id, token=hf_token)
        self.img_size = self.image_processor.size["height"]
        self.img_mean = self.image_processor.image_mean
        self.img_std = self.image_processor.image_std

    def save_pretrained(self, output_dir: str) -> None:
        self.image_processor.save_pretrained(output_dir)

    def _pil_to_tensor(self, img: PILImage.Image) -> torch.Tensor:
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = (arr - np.array(self.img_mean, dtype=np.float32)) / np.array(self.img_std, dtype=np.float32)
        return torch.from_numpy(arr).permute(2, 0, 1)

    @staticmethod
    def _zero_pad_to_square(img: PILImage.Image) -> PILImage.Image:
        w, h = img.size
        max_dim = max(w, h)
        if w == h:
            return img
        padded = PILImage.new("RGB", (max_dim, max_dim), (0, 0, 0))
        padded.paste(img, ((max_dim - w) // 2, (max_dim - h) // 2))
        return padded

    @staticmethod
    def _augment(img: PILImage.Image) -> PILImage.Image:
        if random.random() < 0.5:
            img = img.transpose(PILImage.Transpose.FLIP_LEFT_RIGHT)
        angle = random.uniform(-10, 10)
        img = img.rotate(angle, resample=PILImage.Resampling.BILINEAR, fillcolor=(0, 0, 0))
        img = ImageEnhance.Brightness(img).enhance(random.uniform(0.9, 1.1))
        img = ImageEnhance.Contrast(img).enhance(random.uniform(0.9, 1.1))
        return img

    def process_image(self, img: PILImage.Image, augment: bool) -> torch.Tensor:
        img = img.convert("RGB")
        img = self._zero_pad_to_square(img)
        if augment:
            img = self._augment(img)
        img = img.resize((self.img_size, self.img_size), PILImage.Resampling.BILINEAR)
        return self._pil_to_tensor(img)

    def preprocess_train(self, examples: dict) -> dict:
        examples["pixel_values"] = [self.process_image(img, augment=True) for img in examples["image"]]
        return examples

    def preprocess_eval(self, examples: dict) -> dict:
        examples["pixel_values"] = [self.process_image(img, augment=False) for img in examples["image"]]
        return examples

    def apply(self, train_ds, val_ds, test_ds):
        train_ds = train_ds.map(self.preprocess_train, batched=True, remove_columns=["image"])
        val_ds = val_ds.map(self.preprocess_eval, batched=True, remove_columns=["image"])
        test_ds = test_ds.map(self.preprocess_eval, batched=True, remove_columns=["image"])
        return train_ds, val_ds, test_ds
