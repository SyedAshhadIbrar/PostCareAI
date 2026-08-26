"""Environment helpers for Hugging Face auth and GPU setup."""

from __future__ import annotations

import os
import sys


def setup_cuda() -> None:
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "0":
        os.environ["CUDA_VISIBLE_DEVICES"] = "0"


def disable_torchvision_in_transformers() -> None:
    import transformers.utils.import_utils as import_utils

    import_utils._torchvision_available = False


def resolve_hf_token() -> str | None:
    token = os.environ.get("HF_TOKEN")
    if token:
        return token

    if os.path.exists("/kaggle"):
        try:
            from kaggle_secrets import UserSecretsClient

            secrets = UserSecretsClient()
            for label in ("HF_TOKEN", "PostCare"):
                try:
                    token = secrets.get_secret(label)
                    os.environ["HF_TOKEN"] = token
                    return token
                except Exception:
                    continue
        except ImportError:
            pass

    if "google.colab" in sys.modules:
        try:
            from google.colab import userdata

            token = userdata.get("HF_TOKEN")
            os.environ["HF_TOKEN"] = token
            return token
        except Exception:
            pass

    try:
        from huggingface_hub import get_token

        return get_token()
    except Exception:
        return None


def login_hf(token: str | None) -> None:
    from huggingface_hub import login

    if token:
        login(token=token)
        print("Hugging Face authentication configured")
    else:
        print("Warning: no HF_TOKEN found; gated model download may fail")
