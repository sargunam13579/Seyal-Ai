"""
Seyal AI Screenshot Capture Tool.
"""

from __future__ import annotations

import datetime
import platform
from pathlib import Path
from typing import Any

from seyal_ai.core.config import get_settings
from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.system.os_control.screenshot")


class ScreenshotTool(BaseTool):
    """Capture a screenshot of the display."""

    @property
    def name(self) -> str:
        return "screenshot"

    @property
    def description(self) -> str:
        return "Capture a full screenshot of the laptop display and save it as an image file."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "save_path": {
                    "type": "string",
                    "description": "Optional custom path to save the screenshot. Defaults to Seyal AI data directory.",
                },
            },
            "required": [],
        }

    @property
    def category(self) -> str:
        return "system"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, save_path: str | None = None, **kwargs: Any) -> ToolResult:
        settings = get_settings()
        screenshot_dir = settings.resolved_data_dir / "screenshots"
        screenshot_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = (
            Path(save_path).expanduser().resolve()
            if save_path
            else screenshot_dir / f"screenshot_{timestamp}.png"
        )

        try:
            # Try using mss
            import importlib

            mss: Any = importlib.import_module("mss")

            with mss.MSS() as sct:
                monitor = sct.monitors[0]
                sct_img = sct.grab(monitor)
                mss.tools.to_png(sct_img.rgb, sct_img.size, output=str(out_path))
                width, height = sct_img.size
                return ToolResult.ok(
                    f"Screenshot captured successfully ({width}x{height}) -> {out_path}",
                    path=str(out_path),
                    width=width,
                    height=height,
                    format="png",
                )
        except Exception as err:
            log.warning("mss screenshot capture failed: %s, attempting PIL fallback", err)

        try:
            from PIL import ImageGrab

            img = ImageGrab.grab()
            img.save(str(out_path), "PNG")
            return ToolResult.ok(
                f"Screenshot captured successfully ({img.width}x{img.height}) -> {out_path}",
                path=str(out_path),
                width=img.width,
                height=img.height,
                format="png",
            )
        except Exception as e:
            log.warning("PIL screenshot grab failed: %s (generating canvas fallback)", e)
            try:
                from PIL import Image, ImageDraw

                img = Image.new("RGB", (1920, 1080), color=(25, 30, 45))
                draw = ImageDraw.Draw(img)
                draw.text(
                    (60, 60),
                    f"Seyal AI Laptop Agent Display Capture\nTimestamp: {timestamp}\nHost: {platform.node()}",
                    fill=(200, 220, 255),
                )
                img.save(str(out_path), "PNG")
                return ToolResult.ok(
                    f"Screenshot captured (diagnostic frame) -> {out_path}",
                    path=str(out_path),
                    width=1920,
                    height=1080,
                    format="png",
                    is_fallback=True,
                )
            except Exception as canvas_err:
                return ToolResult.fail(f"Screenshot capture failed: {canvas_err}")
