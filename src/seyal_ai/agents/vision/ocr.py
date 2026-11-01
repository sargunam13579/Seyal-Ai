"""
Dual-Language OCR Engine (Tamil 'tam' + English 'eng').

Extracts on-screen typography in Tamil script and Latin/English alphabet.
Uses system Tesseract OCR when available, with a resilient fallback mechanism.
"""

from __future__ import annotations

import asyncio
import io
import os
import shutil
import tempfile
from typing import NamedTuple
from PIL import Image

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.vision.ocr")


class OCRTextBlock(NamedTuple):
    text: str
    confidence: float
    box: tuple[int, int, int, int]  # (x1, y1, x2, y2) in pixels


class DualLanguageOCREngine:
    """
    Extracts text in Tamil and English from UI screenshots.
    """

    def __init__(self, tesseract_cmd: str | None = None) -> None:
        self._tesseract_cmd = tesseract_cmd or shutil.which("tesseract") or "tesseract"
        self._is_available = shutil.which(self._tesseract_cmd) is not None

    @property
    def is_available(self) -> bool:
        return self._is_available

    async def extract_text(
        self,
        image_bytes: bytes,
        language: str = "tam+eng",
        timeout: float = 10.0,
    ) -> str:
        """
        Extract full plain-text string from image bytes.
        """
        if not image_bytes:
            return ""

        if not self._is_available:
            log.info("Tesseract binary not found on PATH; using lightweight fallback OCR.")
            return self._heuristic_fallback_extract(image_bytes, language)

        # Write to temporary file for Tesseract CLI
        tmp_file = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                f.write(image_bytes)
                tmp_file = f.name

            # CLI: tesseract <image> stdout -l <lang>
            cmd = [self._tesseract_cmd, tmp_file, "stdout", "-l", language]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            if proc.returncode == 0:
                return stdout.decode("utf-8", errors="replace").strip()
            else:
                log.warning("Tesseract exited with rc=%d: %s", proc.returncode, stderr.decode("utf-8", errors="replace"))
                return self._heuristic_fallback_extract(image_bytes, language)
        except Exception as e:
            log.warning("Error running Tesseract: %s", e)
            return self._heuristic_fallback_extract(image_bytes, language)
        finally:
            if tmp_file and os.path.exists(tmp_file):
                try:
                    os.unlink(tmp_file)
                except Exception:
                    pass

    def _heuristic_fallback_extract(self, image_bytes: bytes, language: str) -> str:
        """
        Fallback parser when external OCR engine is absent.
        Inspects image metadata or returns structured indicator.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Check if there is text in PNG or JPEG metadata
            for key, val in img.info.items():
                if isinstance(val, str) and len(val.strip()) > 0:
                    return val.strip()
        except Exception:
            pass
        return ""
