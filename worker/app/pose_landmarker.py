"""Thin wrapper around MediaPipe Pose Landmarker (IMAGE mode).

Kept small and side-effect-light so the geometry/assignment code and its
tests never need the model loaded - only `detect_landmarks` touches
MediaPipe, and it builds the detector lazily on first use.
"""

from __future__ import annotations

import io
import os
import threading
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_full/float16/1/pose_landmarker_full.task"
)
_CACHE_DIR = (
    Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "fitness-worker"
)

_lock = threading.Lock()
_detector = None


def model_path() -> str:
    """The image ships the model at $POSE_LANDMARKER_MODEL; elsewhere (CI,
    local) it's downloaded once into a cache dir."""
    env = os.environ.get("POSE_LANDMARKER_MODEL")
    if env:
        return env
    dest = _CACHE_DIR / "pose_landmarker_full.task"
    if not dest.exists():
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(_MODEL_URL, dest)
    return str(dest)


def _detector_instance():
    global _detector
    if _detector is None:
        with _lock:
            if _detector is None:
                from mediapipe.tasks import python
                from mediapipe.tasks.python import vision

                options = vision.PoseLandmarkerOptions(
                    base_options=python.BaseOptions(model_asset_path=model_path()),
                    num_poses=1,
                )
                _detector = vision.PoseLandmarker.create_from_options(options)
    return _detector


def detect_landmarks(image_bytes: bytes) -> list[dict] | None:
    """First detected pose's 33 landmarks as {x, y, z, visibility} dicts, or
    None when no pose is found."""
    import mediapipe as mp

    # PIL doesn't apply EXIF orientation on load - without this, a phone
    # photo tagged "rotate 90" is fed to the model sideways, so shoulders
    # end up stacked vertically instead of spread horizontally and every
    # geometry feature in pose_geometry.py comes out meaningless.
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes)))
    image = image.convert("RGB")
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB, data=np.asarray(image)
    )
    result = _detector_instance().detect(mp_image)
    if not result.pose_landmarks:
        return None
    return [
        {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
        for lm in result.pose_landmarks[0]
    ]
