"""
Seyal AI Screen OCR & Text Detection Engine.

Extracts visible text, labels, coordinates, and bounding boxes from screenshots
and active application windows.
"""

from __future__ import annotations

import json
import platform
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from PIL import Image

from seyal_ai.utils.logging import get_logger

log = get_logger("vision.ocr")


@dataclass
class TextBlock:
    """A detected text block with bounding box and confidence."""

    text: str
    x: int
    y: int
    width: int
    height: int
    confidence: float = 1.0
    line_number: int = 1

    @property
    def center(self) -> tuple[int, int]:
        """Center coordinate (cx, cy) of text block."""
        return (self.x + self.width // 2, self.y + self.height // 2)

    @property
    def bounds(self) -> tuple[int, int, int, int]:
        """Bounding box tuple (x, y, w, h)."""
        return (self.x, self.y, self.width, self.height)


@dataclass
class OCRResult:
    """Result of screen text recognition."""

    success: bool
    full_text: str
    blocks: list[TextBlock] = field(default_factory=list)
    word_count: int = 0
    line_count: int = 0
    duration_ms: float = 0.0
    error: str | None = None


class ScreenOCR:
    """
    High-performance multi-engine OCR processor for Windows screen images.
    Maintains a persistent background WinRT OCR worker and memory cache
    for sub-150ms text detection.
    """

    def __init__(self) -> None:
        self._is_windows = platform.system() == "Windows"
        self._cache: dict[str, tuple[float, list[TextBlock]]] = {}  # path -> (mtime, blocks)
        self._worker_proc: subprocess.Popen | None = None
        self._worker_failed: bool = False

    def _ensure_worker(self) -> subprocess.Popen | None:
        """Start or return the persistent WinRT OCR PowerShell worker."""
        if not self._is_windows or self._worker_failed:
            return None

        if self._worker_proc is not None:
            if self._worker_proc.poll() is None:
                return self._worker_proc
            self._worker_proc = None

        try:
            ps_worker_script = (
                "[Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null\n"
                "[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null\n"
                "[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null\n"
                "$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()\n"
                "if (-not $engine) {\n"
                "    $lang = [Windows.Globalization.Language]::new('en-US')\n"
                "    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)\n"
                "}\n"
                'Write-Output "READY"\n'
                "while ($path = [Console]::ReadLine()) {\n"
                '    if ($path -eq "QUIT") { break }\n'
                "    if (-not (Test-Path $path)) {\n"
                '        Write-Output "[]"\n'
                "        continue\n"
                "    }\n"
                "    try {\n"
                "        $file = [System.IO.File]::OpenRead($path)\n"
                "        $stream = $file.AsRandomAccessStream()\n"
                "        $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()\n"
                "        $bitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()\n"
                "        $result = $engine.RecognizeAsync($bitmap).GetAwaiter().GetResult()\n"
                "        $items = [System.Collections.Generic.List[PSObject]]::new()\n"
                "        $lineNum = 1\n"
                "        foreach ($line in $result.Lines) {\n"
                "            foreach ($word in $line.Words) {\n"
                "                $rect = $word.BoundingRect\n"
                "                $items.Add([PSCustomObject]@{\n"
                "                    text = $word.Text\n"
                "                    x = [int]$rect.X\n"
                "                    y = [int]$rect.Y\n"
                "                    width = [int]$rect.Width\n"
                "                    height = [int]$rect.Height\n"
                "                    line = $lineNum\n"
                "                })\n"
                "            }\n"
                "            $lineNum++\n"
                "        }\n"
                "        $stream.Dispose()\n"
                "        $file.Dispose()\n"
                "        if ($items.Count -eq 0) {\n"
                '            Write-Output "[]"\n'
                "        } else {\n"
                "            Write-Output ($items | ConvertTo-Json -Compress)\n"
                "        }\n"
                "    } catch {\n"
                '        Write-Output "[]"\n'
                "    }\n"
                "}\n"
            )

            proc = subprocess.Popen(
                ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_worker_script],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
            )
            if proc.stdout:
                ready_line = proc.stdout.readline().strip()
                if ready_line == "READY":
                    self._worker_proc = proc
                    log.info("Persistent WinRT OCR worker initialized successfully")
                    return self._worker_proc

            self._worker_failed = True
            if proc:
                proc.kill()
        except Exception as e:
            log.debug("Persistent OCR worker initialization notice: %s", e)
            self._worker_failed = True

        return None

    def _parse_blocks(self, data: Any) -> list[TextBlock]:
        """Convert raw dictionary items to TextBlock objects."""
        if isinstance(data, dict):
            data = [data]
        if not isinstance(data, list):
            return []
        blocks = []
        for item in data:
            if isinstance(item, dict):
                blocks.append(
                    TextBlock(
                        text=item.get("text", ""),
                        x=int(item.get("x", 0)),
                        y=int(item.get("y", 0)),
                        width=int(item.get("width", 0)),
                        height=int(item.get("height", 0)),
                        line_number=int(item.get("line", 1)),
                    )
                )
        return blocks

    def _ocr_via_windows_media_ocr(self, image_path: str) -> list[TextBlock]:
        """Run native Windows.Media.Ocr via fast persistent worker or fallback."""
        if not self._is_windows:
            return []

        path_obj = Path(image_path)
        if not path_obj.exists():
            return []

        # Cache check by modified time to eliminate duplicate OCR runs (0ms latency)
        mtime = path_obj.stat().st_mtime
        if image_path in self._cache:
            cached_mtime, cached_blocks = self._cache[image_path]
            if cached_mtime == mtime:
                return [TextBlock(**vars(b)) for b in cached_blocks]

        # Fast Path: Persistent worker
        worker = self._ensure_worker()
        if worker and worker.stdin and worker.stdout:
            try:
                worker.stdin.write(f"{image_path}\n")
                worker.stdin.flush()
                raw_out = worker.stdout.readline().strip()
                if raw_out and (raw_out.startswith("[") or raw_out.startswith("{")):
                    data = json.loads(raw_out)
                    blocks = self._parse_blocks(data)
                    self._cache[image_path] = (mtime, blocks)
                    return blocks
            except Exception as e:
                log.debug("Persistent OCR worker communication error: %s, falling back", e)
                try:
                    worker.kill()
                except Exception:
                    pass
                self._worker_proc = None

        # Fallback Path: Direct one-off PowerShell call
        ps_script = f"""
        [Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
        [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
        [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

        $path = '{image_path}'
        $file = [System.IO.File]::OpenRead($path)
        $stream = $file.AsRandomAccessStream()
        $decOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
        $decoder = $decOp.GetAwaiter().GetResult()
        $bitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
        if (-not $engine) {{
            $lang = [Windows.Globalization.Language]::new('en-US')
            $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
        }}
        $result = $engine.RecognizeAsync($bitmap).GetAwaiter().GetResult()

        $items = @()
        $lineNum = 1
        foreach ($line in $result.Lines) {{
            foreach ($word in $line.Words) {{
                $rect = $word.BoundingRect
                $items += @{{
                    text = $word.Text
                    x = [int]$rect.X
                    y = [int]$rect.Y
                    width = [int]$rect.Width
                    height = [int]$rect.Height
                    line = $lineNum
                }}
            }}
            $lineNum++
        }}
        $stream.Dispose()
        $file.Dispose()
        $items | ConvertTo-Json -Compress
        """

        try:
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=10,
            )
            out = proc.stdout.strip()
            if out and (out.startswith("[") or out.startswith("{")):
                data = json.loads(out)
                blocks = self._parse_blocks(data)
                self._cache[image_path] = (mtime, blocks)
                return blocks
        except Exception as e:
            log.debug("Windows.Media.Ocr fallback invocation failed: %s", e)

        return []

    def _ocr_via_uia_text(self) -> list[TextBlock]:
        """Extract native accessible text from foreground window using UI Automation."""
        if not self._is_windows:
            return []

        blocks: list[TextBlock] = []
        try:
            import importlib

            pywinauto: Any = importlib.import_module("pywinauto")

            app = pywinauto.Desktop(backend="uia")
            top_win = app.top_window()

            # Iterate visible controls and get texts
            elements = top_win.descendants()
            line_idx = 1
            for el in elements:
                try:
                    elem_text = el.window_text().strip()
                    if elem_text:
                        r = el.rectangle()
                        blocks.append(
                            TextBlock(
                                text=elem_text,
                                x=r.left,
                                y=r.top,
                                width=max(0, r.width()),
                                height=max(0, r.height()),
                                line_number=line_idx,
                            )
                        )
                        line_idx += 1
                except Exception:
                    continue
        except Exception as e:
            log.debug("UIA text extraction failed: %s", e)

        return blocks

    async def recognize(self, image_input: str | Path | Image.Image) -> OCRResult:
        """
        Perform OCR on a screenshot path or PIL image.
        """
        start_time = time.time()
        blocks: list[TextBlock] = []

        # Resolve file path
        if isinstance(image_input, (str, Path)):
            img_path = str(Path(image_input).resolve())
        else:
            # Save temporary image for OCR
            from seyal_ai.core.config import get_settings

            temp_path = get_settings().resolved_data_dir / "cache" / "ocr_temp.png"
            temp_path.parent.mkdir(parents=True, exist_ok=True)
            image_input.save(str(temp_path), "PNG")
            img_path = str(temp_path)

        # Tier 1: Windows Native Media OCR
        blocks = self._ocr_via_windows_media_ocr(img_path)

        # Tier 2: UIA Text fallback if Media OCR returned nothing
        if not blocks:
            blocks = self._ocr_via_uia_text()

        # Build full text
        full_text_lines: list[str] = []
        current_line = 1
        current_line_words: list[str] = []

        for b in blocks:
            if b.line_number != current_line:
                if current_line_words:
                    full_text_lines.append(" ".join(current_line_words))
                    current_line_words = []
                current_line = b.line_number
            current_line_words.append(b.text)

        if current_line_words:
            full_text_lines.append(" ".join(current_line_words))

        full_text = "\n".join(full_text_lines)
        duration_ms = (time.time() - start_time) * 1000

        return OCRResult(
            success=True,
            full_text=full_text,
            blocks=blocks,
            word_count=len(blocks),
            line_count=len(full_text_lines),
            duration_ms=duration_ms,
        )

    def find_phrase_block(self, query: str, blocks: list[TextBlock]) -> TextBlock | None:
        """
        Locates single-word or multi-word phrases across OCR blocks, synthesizing
        a unified bounding box for multi-word button labels.
        """
        q_norm = query.strip().lower()
        if not q_norm or not blocks:
            return None

        # 1. Exact or partial single block match
        for b in blocks:
            if b.text.lower().strip() == q_norm or q_norm in b.text.lower():
                return b

        # 2. Multi-word contiguous phrase on the same line
        q_words = q_norm.split()
        if len(q_words) > 1:
            # Group blocks by line number
            lines: dict[int, list[TextBlock]] = {}
            for b in blocks:
                lines.setdefault(b.line_number, []).append(b)

            for line_blocks in lines.values():
                # Sort horizontally
                sorted_blocks = sorted(line_blocks, key=lambda b: b.x)
                for i in range(len(sorted_blocks) - len(q_words) + 1):
                    sub = sorted_blocks[i : i + len(q_words)]
                    sub_text = " ".join(b.text.lower().strip() for b in sub)
                    if q_norm in sub_text:
                        min_x = min(b.x for b in sub)
                        min_y = min(b.y for b in sub)
                        max_x = max(b.x + b.width for b in sub)
                        max_y = max(b.y + b.height for b in sub)
                        return TextBlock(
                            text=" ".join(b.text for b in sub),
                            x=min_x,
                            y=min_y,
                            width=max_x - min_x,
                            height=max_y - min_y,
                            line_number=sub[0].line_number,
                        )

        return None
