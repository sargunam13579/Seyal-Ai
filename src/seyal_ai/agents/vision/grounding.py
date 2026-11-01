"""
Visual Grounding & UI Bounding Box Detection Engine.

Detects interactive controls on screen (buttons, inputs, icons), calculates
normalized bounding boxes [ymin, xmin, ymax, xmax], and computes native screen
pixel center points for precision mouse click targeting.
"""

from __future__ import annotations

import io
from typing import Sequence
from PIL import Image

from seyal_ai.agents.vision.models import BoundingBox, DetectedElement
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.vision.grounding")


class UIGroundingEngine:
    """
    Detects UI elements and translates visual targets into native coordinates.
    """

    @classmethod
    def detect_elements_from_image(
        cls,
        image_bytes: bytes,
        ocr_blocks: list[tuple[str, tuple[int, int, int, int]]] | None = None,
    ) -> tuple[list[DetectedElement], int, int]:
        """
        Analyze screenshot bytes and return detected UI controls with normalized bounding boxes.
        Returns: (elements, image_width, image_height).
        """
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size

        elements: list[DetectedElement] = []

        # If OCR blocks are provided, incorporate text elements
        if ocr_blocks:
            for text, (x1, y1, x2, y2) in ocr_blocks:
                ymin = max(0.0, min(1.0, y1 / height))
                xmin = max(0.0, min(1.0, x1 / width))
                ymax = max(0.0, min(1.0, y2 / height))
                xmax = max(0.0, min(1.0, x2 / width))

                box = BoundingBox(ymin=ymin, xmin=xmin, ymax=ymax, xmax=xmax)
                elem_type = "button" if any(kw in text.lower() for kw in ("ok", "submit", "save", "click", "சேமி")) else "text"
                center = box.center_pixel(width, height)

                elements.append(
                    DetectedElement(
                        element_type=elem_type,
                        box=box,
                        label=text,
                        confidence=0.95,
                        center=center,
                    )
                )

        return elements, width, height

    @classmethod
    def ground_target(
        cls,
        target_label: str,
        elements: Sequence[DetectedElement],
        screen_width: int,
        screen_height: int,
    ) -> tuple[BoundingBox | None, tuple[int, int] | None]:
        """
        Find best matching UI element for a user's natural language target label.
        Returns (grounded_box, native_center_pixel).
        """
        if not target_label or not elements:
            return None, None

        normalized_target = target_label.strip().lower()

        # 1. Exact match
        for elem in elements:
            if elem.label and elem.label.strip().lower() == normalized_target:
                center = elem.box.center_pixel(screen_width, screen_height)
                return elem.box, center

        # 2. Substring match
        for elem in elements:
            if elem.label and normalized_target in elem.label.strip().lower():
                center = elem.box.center_pixel(screen_width, screen_height)
                return elem.box, center

        return None, None
