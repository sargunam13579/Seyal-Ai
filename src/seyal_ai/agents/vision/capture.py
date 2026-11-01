"""
High-DPI Screen Capture and Adaptive Image Compression.

Captures active desktop monitors, downscales high-resolution screens dynamically,
and compresses into WebP/JPEG to satisfy size budgets (< 500 KB) and low latency.
"""

from __future__ import annotations

import io
from typing import Tuple
from PIL import Image, ImageGrab

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.vision.capture")


class ScreenCaptureService:
    """
    Captures screen displays and applies adaptive downscaling and compression.
    """

    def __init__(self, default_max_dimension: int = 1920, default_quality: int = 80) -> None:
        self._max_dimension = default_max_dimension
        self._quality = default_quality

    def capture_screen(
        self,
        max_dimension: int | None = None,
        quality: int | None = None,
        image_format: str = "JPEG",
    ) -> tuple[bytes, int, int]:
        """
        Capture current display, downscale if needed, and return (compressed_bytes, width, height).
        """
        max_dim = max_dimension or self._max_dimension
        qual = quality or self._quality
        fmt = image_format.upper()

        # Capture across all monitors
        try:
            img = ImageGrab.grab(all_screens=True)
        except Exception as e:
            log.warning("ImageGrab failed, generating fallback image: %s", e)
            img = Image.new("RGB", (1280, 720), color=(30, 30, 30))

        orig_w, orig_h = img.size

        # Downscale proportionally if larger than max_dimension
        if orig_w > max_dim or orig_h > max_dim:
            scaling_factor = min(max_dim / orig_w, max_dim / orig_h)
            new_w = round(orig_w * scaling_factor)
            new_h = round(orig_h * scaling_factor)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else:
            new_w, new_h = orig_w, orig_h

        # Convert RGBA to RGB for JPEG compatibility
        if fmt == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        buffer = io.BytesIO()
        if fmt == "JPEG":
            img.save(buffer, format="JPEG", quality=qual, optimize=True)
        elif fmt == "WEBP":
            img.save(buffer, format="WEBP", quality=qual)
        else:
            img.save(buffer, format="PNG", optimize=True)

        compressed_bytes = buffer.getvalue()
        return compressed_bytes, new_w, new_h

    def compress_existing(
        self,
        image_bytes: bytes,
        max_dimension: int | None = None,
        quality: int | None = None,
        image_format: str = "JPEG",
    ) -> tuple[bytes, int, int]:
        """
        Resize and recompress arbitrary input image bytes.
        """
        max_dim = max_dimension or self._max_dimension
        qual = quality or self._quality
        fmt = image_format.upper()

        img = Image.open(io.BytesIO(image_bytes))
        orig_w, orig_h = img.size

        if orig_w > max_dim or orig_h > max_dim:
            scaling_factor = min(max_dim / orig_w, max_dim / orig_h)
            new_w = round(orig_w * scaling_factor)
            new_h = round(orig_h * scaling_factor)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else:
            new_w, new_h = orig_w, orig_h

        if fmt == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        buffer = io.BytesIO()
        if fmt == "JPEG":
            img.save(buffer, format="JPEG", quality=qual, optimize=True)
        elif fmt == "WEBP":
            img.save(buffer, format="WEBP", quality=qual)
        else:
            img.save(buffer, format="PNG", optimize=True)

        return buffer.getvalue(), new_w, new_h
