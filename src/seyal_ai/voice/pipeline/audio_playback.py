"""Seyal AI Voice — Audio Playback and Format Conversion Helper."""

from __future__ import annotations

import asyncio
import io
import platform
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

from seyal_ai.utils.logging import get_logger

log = get_logger("voice.pipeline.playback")


async def play_tts_audio(
    audio_bytes: bytes,
    player: Any,
    tts: Any,
    is_running_check: Any,
    sample_rate: int = 16000,
) -> None:
    """Play TTS audio bytes through the speakers.

    Handles format conversion from WAV (pyttsx3) or MP3 (Edge TTS).
    """
    try:
        import wave

        try:
            buf = io.BytesIO(audio_bytes)
            with wave.open(buf, "rb") as wf:
                sr = wf.getframerate()
                frames = wf.readframes(wf.getnframes())
                audio_data = np.frombuffer(frames, dtype=np.int16)
                audio_float = audio_data.astype(np.float32) / 32768.0
                await player.play_audio_async(audio_float, sr)
                return
        except wave.Error:
            pass

        # Edge TTS returns MP3 — convert or play via MCI
        await play_mp3_bytes(
            audio_bytes,
            player=player,
            tts=tts,
            is_running_check=is_running_check,
            sample_rate=sample_rate,
        )

    except Exception as e:
        log.error("Audio playback error: %s", e)


async def play_mp3_bytes(
    mp3_bytes: bytes,
    player: Any,
    tts: Any,
    is_running_check: Any,
    sample_rate: int = 16000,
) -> None:
    """Play MP3 audio bytes by converting to WAV first (via ffmpeg),
    or playing cleanly via Windows native background audio (MCI).
    """
    loop = asyncio.get_event_loop()

    def _convert_and_play() -> None:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(mp3_bytes)
            mp3_path = f.name

        wav_path = mp3_path.replace(".mp3", ".wav")

        import shutil

        try:
            # 1. Try ffmpeg conversion if available on system PATH
            if shutil.which("ffmpeg") is not None:
                kwargs = {}
                if platform.system() == "Windows":
                    kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
                result = subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        mp3_path,
                        "-ar",
                        str(sample_rate),
                        "-ac",
                        "1",
                        "-f",
                        "wav",
                        wav_path,
                    ],
                    capture_output=True,
                    timeout=8,
                    **kwargs,
                )
                if result.returncode == 0 and Path(wav_path).exists():
                    import wave

                    with wave.open(wav_path, "rb") as wf:
                        frames = wf.readframes(wf.getnframes())
                        audio_data = np.frombuffer(frames, dtype=np.int16)
                        audio_float = audio_data.astype(np.float32) / 32768.0
                        player.play_audio(audio_float, sample_rate)
                    return
        except Exception as e:
            log.debug("ffmpeg conversion notice: %s", e)

        # 2. Windows Native Background Audio (MCI) - zero window popups, no external GUI
        try:
            if platform.system() == "Windows":
                import ctypes
                import time
                import uuid

                alias = f"seyal_{uuid.uuid4().hex[:8]}"
                mci = ctypes.windll.winmm.mciSendStringW
                clean_path = str(Path(mp3_path).resolve())
                open_res = mci(f'open "{clean_path}" type mpegvideo alias {alias}', None, 0, None)
                if open_res == 0:
                    try:
                        mci(f"play {alias}", None, 0, None)
                        status_buf = ctypes.create_unicode_buffer(128)
                        while True:
                            if not is_running_check() or tts._stop_requested:
                                mci(f"stop {alias}", None, 0, None)
                                break
                            mci(f"status {alias} mode", status_buf, 128, None)
                            if status_buf.value in ("stopped", ""):
                                break
                            time.sleep(0.04)
                    finally:
                        mci(f"close {alias}", None, 0, None)
                    return
        except Exception as e:
            log.warning("Could not play MP3 audio: %s", e)
        finally:
            try:
                Path(mp3_path).unlink(missing_ok=True)
                Path(wav_path).unlink(missing_ok=True)
            except Exception as cleanup_err:
                log.debug("Temp audio file cleanup: %s", cleanup_err)

    await loop.run_in_executor(None, _convert_and_play)
