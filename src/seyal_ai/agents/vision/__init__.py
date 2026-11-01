"""
Seyal AI Multimodal Vision & UI Grounding Agent Package.

Provides visual perception, UI bounding box detection, dual-language OCR
(Tamil + English), and screen coordinate grounding.
"""

from seyal_ai.agents.vision.agent import VisionAgent
from seyal_ai.agents.vision.capture import ScreenCaptureService
from seyal_ai.agents.vision.grounding import UIGroundingEngine
from seyal_ai.agents.vision.models import (
    BoundingBox,
    DetectedElement,
    VisionRequest,
    VisionResponse,
)
from seyal_ai.agents.vision.ocr import DualLanguageOCREngine

__all__ = [
    "VisionAgent",
    "BoundingBox",
    "DetectedElement",
    "VisionRequest",
    "VisionResponse",
    "ScreenCaptureService",
    "DualLanguageOCREngine",
    "UIGroundingEngine",
]
