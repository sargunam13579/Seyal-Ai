"""
Seyal AI Vision & Screen Understanding Engine.

Provides screen capture, OCR, UI element detection, spatial localization,
and privacy-controlled scene analysis.
"""

from seyal_ai.vision.analyzer import ScreenAnalysisReport, ScreenAnalyzer
from seyal_ai.vision.capture import ScreenCaptureController, ScreenCaptureResult, WindowInfo
from seyal_ai.vision.ocr import OCRResult, ScreenOCR, TextBlock
from seyal_ai.vision.privacy import (
    ScreenAnalysisLog,
    ScreenPermissionMode,
    ScreenPrivacyManager,
)
from seyal_ai.vision.ui_detector import UIElement, UIElementDetector, UIElementType

__all__ = [
    "ScreenPrivacyManager",
    "ScreenPermissionMode",
    "ScreenAnalysisLog",
    "ScreenCaptureController",
    "ScreenCaptureResult",
    "WindowInfo",
    "ScreenOCR",
    "OCRResult",
    "TextBlock",
    "UIElementDetector",
    "UIElement",
    "UIElementType",
    "ScreenAnalyzer",
    "ScreenAnalysisReport",
]
