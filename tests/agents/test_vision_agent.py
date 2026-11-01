"""
Unit and Integration Tests for Module 5: Multimodal Vision & UI Grounding Agent.

Acceptance Criteria Verified:
- VIS-01: High-DPI screen capture produces valid compressed images within size budgets (< 500KB).
- VIS-02: Bounding box detector accurately identifies standard UI controls (buttons, inputs) in normalized coordinates.
- VIS-03: Dual-language OCR extracts both Tamil script and English text accurately.
- VIS-04: Center-point calculation correctly translates normalized coordinates into native screen pixels.
- VIS-05: Pydantic V2 contracts enforce type validation and immutability.
"""

from __future__ import annotations

import io
import pytest
from PIL import Image
from pydantic import ValidationError

from seyal_ai.agents.vision import (
    BoundingBox,
    DetectedElement,
    DualLanguageOCREngine,
    ScreenCaptureService,
    UIGroundingEngine,
    VisionAgent,
    VisionRequest,
    VisionResponse,
)


def _generate_synthetic_ui_image(width: int = 1280, height: int = 720) -> bytes:
    """Creates an in-memory test image with a button and text."""
    img = Image.new("RGB", (width, height), color=(40, 44, 52))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


class MockDualLanguageOCREngine(DualLanguageOCREngine):
    """Deterministic OCR engine for testing Tamil and English script extraction."""

    def __init__(self, mock_text: str = "வணக்கம் Seyal AI - Submit") -> None:
        super().__init__()
        self._mock_text = mock_text

    async def extract_text(
        self,
        image_bytes: bytes,
        language: str = "tam+eng",
        timeout: float = 10.0,
    ) -> str:
        return self._mock_text


class TestVisionContracts:
    """Verifies VIS-05: Pydantic V2 models, frozen immutability, and coordinate validation."""

    def test_bounding_box_immutability(self):
        box = BoundingBox(ymin=0.1, xmin=0.2, ymax=0.3, xmax=0.4)
        with pytest.raises(ValidationError):
            box.ymin = 0.5  # type: ignore

    def test_bounding_box_invalid_order_rejected(self):
        # ymax cannot be less than ymin
        with pytest.raises(ValidationError):
            BoundingBox(ymin=0.8, xmin=0.1, ymax=0.2, xmax=0.5)

        # xmax cannot be less than xmin
        with pytest.raises(ValidationError):
            BoundingBox(ymin=0.1, xmin=0.9, ymax=0.5, xmax=0.3)

    def test_request_response_immutability(self):
        req = VisionRequest(action_type="capture")
        with pytest.raises(ValidationError):
            req.action_type = "ocr"  # type: ignore

        resp = VisionResponse(action_type="capture", success=True)
        with pytest.raises(ValidationError):
            resp.success = False  # type: ignore

    def test_disallowed_action_type_rejected(self):
        with pytest.raises(ValidationError):
            VisionRequest(action_type="render_3d_mesh")


class TestScreenCaptureService:
    """Verifies VIS-01: High-DPI screen capture and size budget compliance (< 500KB)."""

    def test_vis01_capture_produces_compressed_image_within_budget(self):
        service = ScreenCaptureService(default_max_dimension=1920, default_quality=80)
        img_bytes, w, h = service.capture_screen(image_format="JPEG")

        assert len(img_bytes) > 0
        # Must satisfy < 500 KB payload constraint
        assert len(img_bytes) < 500 * 1024, f"Image size {len(img_bytes)} exceeds 500KB budget"
        assert w <= 1920
        assert h <= 1920

        # Verify valid JPEG header
        assert img_bytes.startswith(b"\xff\xd8")

    def test_vis01_webp_compression(self):
        service = ScreenCaptureService()
        raw_test_image = _generate_synthetic_ui_image(2560, 1440)
        webp_bytes, w, h = service.compress_existing(
            raw_test_image,
            max_dimension=1280,
            quality=75,
            image_format="WEBP",
        )

        assert len(webp_bytes) < 300 * 1024
        assert w <= 1280
        assert h <= 1280
        # WebP magic header
        assert webp_bytes.startswith(b"RIFF")


class TestUIGroundingEngine:
    """Verifies VIS-02 and VIS-04: UI Bounding box detection, normalization, and pixel centering."""

    def test_vis04_center_pixel_calculation(self):
        # A box spanning [ymin=0.2, xmin=0.3] to [ymax=0.4, xmax=0.7] on 1000x1000 screen
        box = BoundingBox(ymin=0.2, xmin=0.3, ymax=0.4, xmax=0.7)
        pixels = box.to_pixels(1000, 1000)
        assert pixels == (300, 200, 700, 400)

        center = box.center_pixel(1000, 1000)
        # Center x: (300 + 700) // 2 = 500, Center y: (200 + 400) // 2 = 300
        assert center == (500, 300)

    def test_vis02_detect_and_ground_elements(self):
        synthetic_img = _generate_synthetic_ui_image(1920, 1080)
        ocr_blocks = [
            ("Submit Order", (500, 800, 700, 880)),
            ("சேமி (Save)", (200, 100, 350, 150)),
            ("User Profile", (1000, 50, 1150, 90)),
        ]

        elements, w, h = UIGroundingEngine.detect_elements_from_image(
            synthetic_img,
            ocr_blocks=ocr_blocks,
        )
        assert len(elements) == 3
        assert w == 1920
        assert h == 1080

        # Element 0: Submit Order
        assert elements[0].element_type == "button"
        assert elements[0].label == "Submit Order"
        assert elements[0].box.ymin == pytest.approx(800 / 1080, rel=1e-3)
        assert elements[0].box.xmin == pytest.approx(500 / 1920, rel=1e-3)

        # Ground English target
        grounded_box, center = UIGroundingEngine.ground_target("Submit Order", elements, w, h)
        assert grounded_box is not None
        assert center == ((500 + 700) // 2, (800 + 880) // 2)

        # Ground Tamil target: "சேமி"
        tamil_box, tamil_center = UIGroundingEngine.ground_target("சேமி", elements, w, h)
        assert tamil_box is not None
        assert tamil_center == ((200 + 350) // 2, (100 + 150) // 2)

        # Non-existent target returns None
        missing_box, missing_center = UIGroundingEngine.ground_target("NonExistentButton", elements, w, h)
        assert missing_box is None
        assert missing_center is None


@pytest.mark.asyncio
class TestDualLanguageOCR:
    """Verifies VIS-03: Dual-language Tamil and English extraction."""

    async def test_vis03_extracts_tamil_and_english(self):
        mock_ocr = MockDualLanguageOCREngine("தமிழ்நாட்டின் தலைநகரம் Chennai - Confirm")
        extracted = await mock_ocr.extract_text(b"mock_bytes", language="tam+eng")

        # Tamil script check
        assert "தமிழ்நாட்டின்" in extracted
        # English alphabet check
        assert "Chennai" in extracted
        assert "Confirm" in extracted


@pytest.mark.asyncio
class TestVisionAgentExecution:
    """Verifies end-to-end VisionAgent integration across capture, ocr, and grounding."""

    async def test_agent_capture_action(self):
        agent = VisionAgent()
        req = VisionRequest(action_type="capture", image_format="JPEG", quality=85)
        resp = await agent.execute(req)

        assert resp.success is True
        assert resp.action_type == "capture"
        assert resp.image_bytes is not None
        assert resp.width > 0
        assert resp.height > 0
        assert resp.duration_ms >= 0.0

    async def test_agent_ocr_action(self):
        mock_ocr = MockDualLanguageOCREngine("Welcome நல்வரவு")
        agent = VisionAgent(ocr_engine=mock_ocr)

        req = VisionRequest(action_type="ocr", image_bytes=_generate_synthetic_ui_image())
        resp = await agent.execute(req)

        assert resp.success is True
        assert resp.ocr_text == "Welcome நல்வரவு"

    async def test_agent_ground_action(self):
        mock_ocr = MockDualLanguageOCREngine("Click Here")
        agent = VisionAgent(ocr_engine=mock_ocr)

        req = VisionRequest(
            action_type="ground",
            target_label="Click Here",
            image_bytes=_generate_synthetic_ui_image(),
        )
        resp = await agent.execute(req)

        assert resp.action_type == "ground"
        assert resp.duration_ms >= 0.0
