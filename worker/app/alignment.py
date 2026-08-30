"""Pose-specific alignment validation for the `analyze-alignment` stage.

Pure and deterministic: it works only from the landmarks the detect stage
already stored (ADR-013 - MediaPipe is never re-run here), so missing or
too-few landmarks is a permanent failure, not something a retry can fix.
"""

from __future__ import annotations

from . import pose_geometry as geom
from .errors import PermanentJobError

_NEEDED = geom.RIGHT_HIP + 1

# Thresholds in MediaPipe's normalised [0,1] coordinates, first-pass
# calibrated on the geometry model like pose_geometry.py's - revisit once
# real progress photos exist.
_MIN_VISIBILITY = 0.5
# How far the shoulder-midpoint x may sit from the frame centre.
_CENTERED_MAX_OFFSET = 0.15
# Allowed y gap between a left/right landmark pair before it reads as tilted.
_LEVEL_MAX_DELTA = 0.06
# Torso horizontal drift allowed per unit of its vertical span.
_UPRIGHT_MAX_RATIO = 0.25
# Allowed left/right eye+ear visibility gap for a frontal shot.
_FACING_MAX_ASYMMETRY = 0.25
# A true profile hides one side (large visibility gap) and collapses the
# shoulder line toward zero width.
_PROFILE_MIN_ASYMMETRY = 0.3
_PROFILE_MAX_SHOULDER_SPAN = 0.12
# A genuine back shot keeps the face landmarks below this visibility.
_FACE_HIDDEN_MAX_VISIBILITY = 0.5

_FRAME_KEYPOINTS = (
    geom.NOSE,
    geom.LEFT_SHOULDER,
    geom.RIGHT_SHOULDER,
    geom.LEFT_HIP,
    geom.RIGHT_HIP,
)


class PoseNotDetectedError(PermanentJobError):
    """The detect stage left no usable landmarks for this photo."""


Landmark = dict


def _y(landmarks: list[Landmark], idx: int) -> float:
    return landmarks[idx]["y"]


def _within_bounds(landmarks: list[Landmark], idx: int) -> bool:
    lm = landmarks[idx]
    return 0.0 <= lm["x"] <= 1.0 and 0.0 <= lm["y"] <= 1.0


def _midpoint_x(landmarks: list[Landmark], a: int, b: int) -> float:
    return (geom._x(landmarks, a) + geom._x(landmarks, b)) / 2


def _midpoint_y(landmarks: list[Landmark], a: int, b: int) -> float:
    return (_y(landmarks, a) + _y(landmarks, b)) / 2


def _check(name: str, passed: bool, value: float) -> dict:
    return {"name": name, "passed": bool(passed), "value": round(value, 4)}


def _subject_in_frame(landmarks: list[Landmark]) -> dict:
    tracked = [
        idx
        for idx in _FRAME_KEYPOINTS
        if geom._vis(landmarks, idx) >= _MIN_VISIBILITY
    ]
    passed = len(tracked) >= 2 and all(
        _within_bounds(landmarks, idx) for idx in tracked
    )
    return _check(
        "subject_in_frame", passed, len(tracked) / len(_FRAME_KEYPOINTS)
    )


def _centered(landmarks: list[Landmark]) -> dict:
    offset = abs(
        _midpoint_x(landmarks, geom.LEFT_SHOULDER, geom.RIGHT_SHOULDER) - 0.5
    )
    return _check("centered", offset <= _CENTERED_MAX_OFFSET, offset)


def _upright(landmarks: list[Landmark]) -> dict:
    shoulder_x = _midpoint_x(landmarks, geom.LEFT_SHOULDER, geom.RIGHT_SHOULDER)
    shoulder_y = _midpoint_y(landmarks, geom.LEFT_SHOULDER, geom.RIGHT_SHOULDER)
    hip_x = _midpoint_x(landmarks, geom.LEFT_HIP, geom.RIGHT_HIP)
    hip_y = _midpoint_y(landmarks, geom.LEFT_HIP, geom.RIGHT_HIP)
    lean = abs(hip_x - shoulder_x) / max(abs(hip_y - shoulder_y), 1e-6)
    return _check("upright", lean <= _UPRIGHT_MAX_RATIO, lean)


def _shoulders_level(landmarks: list[Landmark]) -> dict:
    delta = abs(_y(landmarks, geom.LEFT_SHOULDER) - _y(landmarks, geom.RIGHT_SHOULDER))
    return _check("shoulders_level", delta <= _LEVEL_MAX_DELTA, delta)


def _hips_level(landmarks: list[Landmark]) -> dict:
    delta = abs(_y(landmarks, geom.LEFT_HIP) - _y(landmarks, geom.RIGHT_HIP))
    return _check("hips_level", delta <= _LEVEL_MAX_DELTA, delta)


def _facing_camera(landmarks: list[Landmark]) -> dict:
    pairs = (
        (geom.LEFT_EYE, geom.RIGHT_EYE),
        (geom.LEFT_EAR, geom.RIGHT_EAR),
    )
    min_visibility = min(
        geom._vis(landmarks, idx) for pair in pairs for idx in pair
    )
    asymmetry = max(
        abs(geom._vis(landmarks, left) - geom._vis(landmarks, right))
        for left, right in pairs
    )
    passed = (
        min_visibility >= _MIN_VISIBILITY and asymmetry <= _FACING_MAX_ASYMMETRY
    )
    return _check("facing_camera", passed, asymmetry)


def _true_profile(landmarks: list[Landmark]) -> dict:
    asymmetry = max(
        abs(
            geom._vis(landmarks, geom.LEFT_SHOULDER)
            - geom._vis(landmarks, geom.RIGHT_SHOULDER)
        ),
        abs(geom._vis(landmarks, geom.LEFT_EAR) - geom._vis(landmarks, geom.RIGHT_EAR)),
    )
    shoulder_span = abs(
        geom._x(landmarks, geom.LEFT_SHOULDER) - geom._x(landmarks, geom.RIGHT_SHOULDER)
    )
    passed = (
        asymmetry >= _PROFILE_MIN_ASYMMETRY
        and shoulder_span <= _PROFILE_MAX_SHOULDER_SPAN
    )
    return _check("true_profile", passed, shoulder_span)


def _body_vertical(landmarks: list[Landmark]) -> dict:
    hip_x = _midpoint_x(landmarks, geom.LEFT_HIP, geom.RIGHT_HIP)
    hip_y = _midpoint_y(landmarks, geom.LEFT_HIP, geom.RIGHT_HIP)
    lean = abs(geom._x(landmarks, geom.NOSE) - hip_x) / max(
        abs(hip_y - _y(landmarks, geom.NOSE)), 1e-6
    )
    return _check("body_vertical", lean <= _UPRIGHT_MAX_RATIO, lean)


def _face_hidden(landmarks: list[Landmark]) -> dict:
    face_visibility = max(
        geom._vis(landmarks, geom.NOSE),
        geom._vis(landmarks, geom.LEFT_EYE),
        geom._vis(landmarks, geom.RIGHT_EYE),
    )
    return _check(
        "face_hidden",
        face_visibility < _FACE_HIDDEN_MAX_VISIBILITY,
        face_visibility,
    )


_COMMON_CHECKS = (_subject_in_frame, _centered, _upright)
_POSE_CHECKS = {
    "front": (_shoulders_level, _hips_level, _facing_camera),
    "side": (_true_profile, _body_vertical),
    "back": (_shoulders_level, _face_hidden),
}


def analyze_alignment(pose: str, landmarks: list | None) -> dict:
    if not landmarks or len(landmarks) < _NEEDED:
        raise PoseNotDetectedError(
            f"no usable landmarks for a {pose} alignment check"
        )

    checks = [
        check(landmarks)
        for check in (*_COMMON_CHECKS, *_POSE_CHECKS.get(pose, ()))
    ]
    return {
        "pose": pose,
        "aligned": all(check["passed"] for check in checks),
        "checks": checks,
        "landmark_count": len(landmarks),
    }
