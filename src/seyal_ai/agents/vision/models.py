"""
Pydantic V2 Request and Response Models for Multimodal Vision & UI Grounding Agent.

Provides immutable contracts for screen capture, UI bounding box detection,
dual-language OCR (Tamil + English), and screen coordinate grounding.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class BoundingBox(BaseModel):
    """
    Normalized bounding box coordinates in the range [0.0, 1.0].
    ymin, xmin, ymax, xmax convention.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    ymin: float = Field(..., ge=0.0, le=1.0, description="Top edge (0.0 - 1.0).")
    xmin: float = Field(..., ge=0.0, le=1.0, description="Left edge (0.0 - 1.0).")
    ymax: float = Field(..., ge=0.0, le=1.0, description="Bottom edge (0.0 - 1.0).")
    xmax: float = Field(..., ge=0.0, le=1.0, description="Right edge (0.0 - 1.0).")

    @field_validator("ymax")
    @classmethod
    def validate_vertical(cls, ymax: float, info: Any) -> float:
        ymin = info.data.get("ymin", 0.0)
        if ymax < ymin:
            raise ValueError(f"ymax ({ymax}) cannot be less than ymin ({ymin}).")
        return ymax

    @field_validator("xmax")
    @classmethod
    def validate_horizontal(cls, xmax: float, info: Any) -> float:
        xmin = info.data.get("xmin", 0.0)
        if xmax < xmin:
            raise ValueError(f"xmax ({xmax}) cannot be less than xmin ({xmin}).")
        return xmax

    def to_pixels(self, screen_width: int, screen_height: int) -> tuple[int, int, int, int]:
        """Convert normalized coords to native screen pixel bounds (x1, y1, x2, y2)."""
        x1 = round(self.xmin * screen_width)
        y1 = round(self.ymin * screen_height)
        x2 = round(self.xmax * screen_width)
        y2 = round(self.ymax * screen_height)
        return (x1, y1, x2, y2)

    def center_pixel(self, screen_width: int, screen_height: int) -> tuple[int, int]:
        """Calculate native screen pixel center point (center_x, center_y)."""
        x1, y1, x2, y2 = self.to_pixels(screen_width, screen_height)
        return ((x1 + x2) // 2, (y1 + y2) // 2)


class DetectedElement(BaseModel):
    """A detected interactive UI element or text block on screen."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    element_type: str = Field(..., description="Element type: 'button', 'input', 'text', 'icon', 'dropdown'.")
    box: BoundingBox = Field(..., description="Normalized bounding box.")
    label: str | None = Field(default=None, description="Recognized label or OCR text.")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Detection confidence.")
    center: tuple[int, int] = Field(default=(0, 0), description="Native screen center pixel (x, y).")


class VisionRequest(BaseModel):
    """
    Immutable request for vision agent operations.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(
        ...,
        description="Action: 'capture', 'ground', 'ocr', 'detect_elements'.",
    )
    image_bytes: bytes | None = Field(default=None, description="Optional raw image bytes if processing external image.")
    target_label: str | None = Field(default=None, description="Target label for grounding (e.g. 'Submit', 'சேமி').")
    language: str = Field(default="tam+eng", description="OCR language: 'tam', 'eng', or 'tam+eng'.")
    max_dimension: int = Field(default=1920, ge=320, le=3840, description="Max width or height after downscaling.")
    quality: int = Field(default=80, ge=10, le=100, description="Compression quality (10-100).")
    image_format: str = Field(default="JPEG", description="Output format: 'JPEG', 'WEBP', 'PNG'.")

    @field_validator("action_type")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = {"capture", "ground", "ocr", "detect_elements"}
        lowered = v.strip().lower()
        if lowered not in allowed:
            raise ValueError(f"Unknown action_type '{v}'. Allowed: {sorted(allowed)}")
        return lowered

    @field_validator("image_format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        allowed = {"JPEG", "WEBP", "PNG"}
        upper = v.strip().upper()
        if upper not in allowed:
            raise ValueError(f"Unknown image_format '{v}'. Allowed: {sorted(allowed)}")
        return upper


class VisionResponse(BaseModel):
    """
    Immutable response returned by VisionAgent.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(..., description="Action that was executed.")
    success: bool = Field(..., description="Whether the operation succeeded.")
    image_bytes: bytes | None = Field(default=None, description="Compressed image bytes if captured.")
    width: int = Field(default=0, ge=0, description="Image width in pixels.")
    height: int = Field(default=0, ge=0, description="Image height in pixels.")
    elements: list[DetectedElement] = Field(default_factory=list, description="Detected UI elements.")
    ocr_text: str | None = Field(default=None, description="Full extracted OCR text string.")
    grounded_box: BoundingBox | None = Field(default=None, description="Grounded bounding box if requested.")
    grounded_center: tuple[int, int] | None = Field(default=None, description="Grounded native center pixel (x, y).")
    duration_ms: float = Field(default=0.0, ge=0.0, description="Execution time in milliseconds.")
    error: str | None = Field(default=None, description="Error message if operation failed.")
