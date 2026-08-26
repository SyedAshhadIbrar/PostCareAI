"""Dataset loading and label encoding."""

from __future__ import annotations

import os
import zipfile

import pandas as pd
import torch
from datasets import Dataset, Features, Image as HFImage, Sequence, Value
from tqdm.auto import tqdm

from .config import ExperimentConfig, LABEL_NAMES


def encode_labels(row: pd.Series) -> list[float]:
    """Convert a CSV row into a 6-dim label vector with -1.0 for MISSING."""
    labels: list[float] = []

    labels.append(1.0 if row["healing_status"] == "Not Healed" else 0.0)

    if row["erythema"] == "MISSING":
        labels.append(-1.0)
    else:
        labels.append(1.0 if row["erythema"] == "Existent" else 0.0)

    if row["edema"] == "MISSING":
        labels.append(-1.0)
    else:
        labels.append(1.0 if row["edema"] == "Existent" else 0.0)

    labels.append(1.0 if row["infection_risk"] in ("Medium", "High") else 0.0)
    labels.append(0.0 if str(row["urgency_level"]).startswith("Home Care") else 1.0)

    if row["exudate_type"] == "MISSING":
        labels.append(-1.0)
    elif row["exudate_type"] == "Non-existent":
        labels.append(0.0)
    else:
        labels.append(1.0)

    return labels


def ensure_images_available(base_path: str) -> None:
    images_dir = os.path.join(base_path, "images")
    images_zip = os.path.join(base_path, "images.zip")
    if not os.path.isdir(images_dir) and os.path.isfile(images_zip):
        with zipfile.ZipFile(images_zip, "r") as zf:
            zf.extractall(base_path)


def load_labels_dataframe(cfg: ExperimentConfig) -> pd.DataFrame:
    base_path = cfg.data.base_path
    assert base_path is not None

    ensure_images_available(base_path)
    labels_csv = os.path.join(base_path, "labels.csv")
    df = pd.read_csv(labels_csv)

    split_counts = df["split"].value_counts().to_dict()
    for split_name, expected in cfg.data.expected_splits.items():
        actual = split_counts.get(split_name, 0)
        if actual != expected:
            raise ValueError(f"Expected {expected} {split_name} samples, got {actual}")

    missing_images = []
    for _, row in df.iterrows():
        img_path = os.path.join(base_path, row["image_path"])
        if not os.path.exists(img_path):
            missing_images.append(img_path)

    if missing_images:
        raise FileNotFoundError(f"{len(missing_images)} images missing; first: {missing_images[0]}")

    return df


def build_dataset_from_split(split_df: pd.DataFrame, split_name: str, base_path: str) -> Dataset:
    image_paths: list[str] = []
    labels: list[list[float]] = []
    skipped = 0

    for _, row in tqdm(split_df.iterrows(), total=len(split_df), desc=f"Loading {split_name}"):
        img_path = os.path.join(base_path, row["image_path"])
        if not os.path.exists(img_path):
            skipped += 1
            continue
        image_paths.append(img_path)
        labels.append(encode_labels(row))

    if skipped:
        print(f"  Skipped {skipped} missing images in {split_name}")

    features = Features(
        {
            "image": HFImage(),
            "label": Sequence(Value("float32"), length=len(LABEL_NAMES)),
        }
    )

    return Dataset.from_dict({"image": image_paths, "label": labels}, features=features)


def load_datasets(cfg: ExperimentConfig) -> tuple[pd.DataFrame, Dataset, Dataset, Dataset]:
    base_path = cfg.data.base_path
    assert base_path is not None

    df = load_labels_dataframe(cfg)
    train_ds = build_dataset_from_split(df[df["split"] == "train"], "train", base_path)
    val_ds = build_dataset_from_split(df[df["split"] == "validation"], "validation", base_path)
    test_ds = build_dataset_from_split(df[df["split"] == "test"], "test", base_path)
    return df, train_ds, val_ds, test_ds


def collate_fn(examples: list[dict]) -> dict[str, torch.Tensor]:
    pixel_values = torch.stack([torch.tensor(ex["pixel_values"]) for ex in examples])
    labels = torch.tensor([ex["label"] for ex in examples], dtype=torch.float)
    return {"pixel_values": pixel_values, "labels": labels}
