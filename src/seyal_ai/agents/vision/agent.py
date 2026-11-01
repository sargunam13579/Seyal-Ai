"""
Multimodal Vision & UI Grounding Agent (Module 5).

Provides screen perception, UI bounding box grounding, dual-language OCR
(Tamil + English), and screen coordinate translation for autonomous action.
"""

from __future__ import annotations

import time
from typing import Any

from seyal_ai.agents.vision.capture import ScreenCaptureService
from seyal_ai.agents.vision.grounding import UIGroundingEngine
from seyal_ai.agents.vision.models import (
    BoundingBox,
    DetectedElement,
    VisionRequest,
    VisionResponse,
)
from seyal_ai.agents.vision.ocr import DualLanguageOCREngine
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.vision")


class VisionAgent:
    """
    Multimodal Vision and Grounding Agent for Seyal AI.
    """

    def __init__(
        self,
        capture_service: ScreenCaptureService | None = None,
        ocr_engine: DualLanguageOCREngine | None = None,
    ) -> None:
        self._capture = capture_service or ScreenCaptureService()
        self._ocr = ocr_engine or DualLanguageOCREngine()

    @property
    def capture_service(self) -> ScreenCaptureService:
        return self._capture

    @property
    def ocr_engine(self) -> DualLanguageOCREngine:
        return self._ocr

    async def execute(self, request: VisionRequest) -> VisionResponse:
        """
        Execute an immutable VisionRequest operation.
        """
        start_time = time.perf_counter()
        act = request.action_type.lower()

        try:
            # 1. Action: capture
            if act == "capture":
                img_bytes, width, height = self._capture.capture_screen(
                    max_dimension=request.max_dimension,
                    quality=request.quality,
                    image_format=request.image_format,
                )
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return VisionResponse(
                    action_type="capture",
                    success=True,
                    image_bytes=img_bytes,
                    width=width,
                    height=height,
                    duration_ms=round(elapsed_ms, 2),
                )

            # 2. Prepare target image bytes for downstream vision tasks
            img_bytes = request.image_bytes
            width = 0
            height = 0
            if not img_bytes:
                img_bytes, width, height = self._capture.capture_screen(
                    max_dimension=request.max_dimension,
                    quality=request.quality,
                    image_format=request.image_format,
                )

            # 3. Action: ocr
            if act == "ocr":
                text = await self._ocr.extract_text(img_bytes, language=request.language)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return VisionResponse(
                    action_type="ocr",
                    success=True,
                    image_bytes=img_bytes,
                    width=width,
                    height=height,
                    ocr_text=text,
                    duration_ms=round(elapsed_ms, 2),
                )

            # 4. Action: detect_elements
            elif act == "detect_elements":
                elements, w, h = UIGroundingEngine.detect_elements_from_image(img_bytes)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return VisionResponse(
                    action_type="detect_elements",
                    success=True,
                    image_bytes=img_bytes,
                    width=w,
                    height=h,
                    elements=elements,
                    duration_ms=round(elapsed_ms, 2),
                )

            # 5. Action: ground
            elif act == "ground":
                if not request.target_label:
                    raise ValueError("target_label is required for 'ground' action.")

                elements, w, h = UIGroundingEngine.detect_elements_from_image(img_bytes)
                grounded_box, center_pixel = UIGroundingEngine.ground_target(
                    request.target_label,
                    elements,
                    screen_width=w or 1920,
                    screen_height=h or 1080,
                )

                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return VisionResponse(
                    action_type="ground",
                    success=grounded_box is not None,
                    image_bytes=img_bytes,
                    width=w,
                    height=h,
                    elements=elements,
                    grounded_box=grounded_box,
                    grounded_center=center_pixel,
                    duration_ms=round(elapsed_ms, 2),
                )

            else:
                raise ValueError(f"Unsupported action_type: {act}")

        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.error("Vision operation failed: %s", e)
            return VisionResponse(
                action_type=request.action_type,
                success=False,
                duration_ms=round(elapsed_ms, 2),
                error=str(e),
            )
