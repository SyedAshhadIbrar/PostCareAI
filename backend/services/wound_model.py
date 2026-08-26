"""MedSigLIP wound classification inference service."""

from __future__ import annotations

import io
import json
import logging
from pathlib import Path
from typing import Any

from backend.core.settings import DEVICE, HF_TOKEN, MODEL_DIR
from backend.schemas.assessment import Finding, WoundAssessment

logger = logging.getLogger(__name__)

# Match training/eval preprocessing (no torchvision, no augmentation).
IMG_MEAN = [0.5, 0.5, 0.5]
IMG_STD = [0.5, 0.5, 0.5]


def _disable_torchvision_in_transformers() -> None:
    try:
        import transformers.utils.import_utils as import_utils

        import_utils._torchvision_available = False
    except Exception:
        pass


def _zero_pad_to_square(img: Any) -> Any:
    from PIL import Image as PILImage

    w, h = img.size
    max_dim = max(w, h)
    if w == h:
        return img
    padded = PILImage.new("RGB", (max_dim, max_dim), (0, 0, 0))
    padded.paste(img, ((max_dim - w) // 2, (max_dim - h) // 2))
    return padded


def _pil_to_tensor(img: Any, img_size: int) -> Any:
    import numpy as np
    import torch
    from PIL import Image as PILImage

    img = img.convert("RGB")
    img = _zero_pad_to_square(img)
    img = img.resize((img_size, img_size), PILImage.Resampling.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - np.array(IMG_MEAN, dtype=np.float32)) / np.array(IMG_STD, dtype=np.float32)
    return torch.from_numpy(arr).permute(2, 0, 1)


class WoundModel:
    """Loads fine-tuned MedSigLIP and returns structured multi-label findings."""

    def __init__(self, model_dir: Path | None = None) -> None:
        import torch

        _disable_torchvision_in_transformers()
        self.model_dir = Path(model_dir or MODEL_DIR)
        self.config = self._load_json(self.model_dir / "postcare_config.json")
        self.thresholds = self._load_json(self.model_dir / "thresholds.json")
        self.labels: list[str] = self.config["labels"]
        self.image_size: int = int(self.config.get("image_size", 448))
        self.model_version: str = self.config.get("model_version", "unknown")
        self.device = DEVICE if torch.cuda.is_available() and DEVICE != "cpu" else "cpu"
        self.model = self._load_model()
        self.model.eval()
        logger.info(
            "WoundModel ready: version=%s labels=%d device=%s dir=%s",
            self.model_version,
            len(self.labels),
            self.device,
            self.model_dir,
        )

    @staticmethod
    def _load_json(path: Path) -> dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(
                f"Missing {path}. Run training then: "
                "python training/scripts/export_production_model.py"
            )
        return json.loads(path.read_text(encoding="utf-8"))

    def _load_model(self) -> Any:
        import torch
        from transformers import AutoModelForImageClassification

        weights_pt = self.model_dir / "best_model.pt"
        has_hf_weights = any(
            (self.model_dir / name).exists()
            for name in ("model.safetensors", "pytorch_model.bin")
        )
        hf_config = self.model_dir / "config.json"

        id2label = {i: name for i, name in enumerate(self.labels)}
        label2id = {name: i for i, name in enumerate(self.labels)}

        if has_hf_weights and hf_config.exists():
            model = AutoModelForImageClassification.from_pretrained(
                str(self.model_dir),
                local_files_only=True,
            )
        else:
            base_model = self.config.get("base_model", "google/medsiglip-448")
            model = AutoModelForImageClassification.from_pretrained(
                base_model,
                problem_type="multi_label_classification",
                num_labels=len(self.labels),
                id2label=id2label,
                label2id=label2id,
                ignore_mismatched_sizes=True,
                token=HF_TOKEN,
            )
            if weights_pt.exists():
                state = torch.load(weights_pt, map_location="cpu", weights_only=True)
                model.load_state_dict(state, strict=False)
                logger.info("Loaded fine-tuned weights from %s", weights_pt)
            else:
                logger.warning(
                    "No fine-tuned weights in %s — using randomly initialized head.",
                    self.model_dir,
                )

        return model.to(self.device)

    def preprocess(self, image: Any) -> Any:
        from PIL import Image as PILImage

        if isinstance(image, bytes):
            image = PILImage.open(io.BytesIO(image))
        tensor = _pil_to_tensor(image, self.image_size)
        return tensor.unsqueeze(0).to(self.device)

    def predict(self, image: Any) -> WoundAssessment:
        import torch

        pixel_values = self.preprocess(image)
        with torch.no_grad():
            logits = self.model(pixel_values=pixel_values).logits[0]
        scores = torch.sigmoid(logits).cpu().numpy()

        findings: dict[str, Finding] = {}
        for i, name in enumerate(self.labels):
            threshold = float(self.thresholds.get(name, 0.5))
            score = float(scores[i])
            findings[name] = Finding(
                positive=score >= threshold,
                score=round(score, 4),
                threshold=threshold,
            )

        return WoundAssessment(
            healing_status=findings["healing_status"],
            erythema=findings["erythema"],
            edema=findings["edema"],
            infection_risk=findings["infection_risk"],
            urgency=findings["urgency"],
            exudate=findings["exudate"],
            model_version=self.model_version,
        )


def _build_wound_model() -> WoundModel | None:
    try:
        return WoundModel()
    except Exception as exc:
        logger.warning("WoundModel not loaded: %s", exc)
        return None


wound_model: WoundModel | None = _build_wound_model()
