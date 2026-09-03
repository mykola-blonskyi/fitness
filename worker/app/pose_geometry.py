"""Front/side/back classification from MediaPipe Pose Landmarker output.

A geometry heuristic over the 33 BlazePose landmarks - no separately
trained classifier (ADR-013). Produces a score per pose; the joint
assignment across a session's photos happens in pose_assignment.py.

Hip landmarks aren't used for classification here (LEFT_HIP/RIGHT_HIP are
kept as shared index constants for alignment.py): on two real progress
photos that were misclassified in production, hip visibility was ~0-3%
(they're commonly out of frame or occluded in a phone-held-at-chest-height
shot), so their x-position was noise the original version still let
outrank the shoulders. Shoulder and nose landmarks stayed reliably
visible (>99%) on the same photos.
"""

from __future__ import annotations

POSES = ("front", "side", "back")

# BlazePose landmark indices used here.
NOSE = 0
LEFT_EYE = 2
RIGHT_EYE = 5
LEFT_EAR = 7
RIGHT_EAR = 8
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_HIP = 23
RIGHT_HIP = 24

Landmark = dict  # {"x", "y", "z", "visibility"}


def _vis(landmarks: list[Landmark], idx: int) -> float:
    return max(0.0, min(1.0, landmarks[idx].get("visibility", 0.0)))


def _x(landmarks: list[Landmark], idx: int) -> float:
    return landmarks[idx]["x"]


def _clamp01(v: float) -> float:
    return 0.0 if v < 0.0 else 1.0 if v > 1.0 else v


# A frontal/back torso is at least ~0.15 of the frame wide; a true profile
# collapses it toward zero.
_WIDE_AT = 0.15
_NARROW_AT = 0.06
# A profile's nose sits near or past the (collapsed) shoulder line; a small
# head turn in a frontal shot shouldn't count.
_NOSE_OFFSET_MIN = 0.35
_NOSE_OFFSET_SPAN = 0.35


def _features(landmarks: list[Landmark]) -> dict:
    shoulder_span = abs(
        _x(landmarks, LEFT_SHOULDER) - _x(landmarks, RIGHT_SHOULDER)
    )

    face_vis = (
        _vis(landmarks, NOSE)
        + _vis(landmarks, LEFT_EYE)
        + _vis(landmarks, RIGHT_EYE)
    ) / 3

    ear_asym = abs(_vis(landmarks, LEFT_EAR) - _vis(landmarks, RIGHT_EAR))
    shoulder_asym = abs(
        _vis(landmarks, LEFT_SHOULDER) - _vis(landmarks, RIGHT_SHOULDER)
    )

    shoulder_mid_x = (
        _x(landmarks, LEFT_SHOULDER) + _x(landmarks, RIGHT_SHOULDER)
    ) / 2
    nose_offset = abs(_x(landmarks, NOSE) - shoulder_mid_x) / max(
        shoulder_span, 1e-3
    )

    return {
        "body_width": shoulder_span,
        "face_vis": face_vis,
        "asymmetry": max(ear_asym, shoulder_asym),
        "nose_offset": nose_offset,
    }


def _frontality(body_width: float) -> float:
    if body_width >= _WIDE_AT:
        return 1.0
    if body_width <= _NARROW_AT:
        return 0.0
    return (body_width - _NARROW_AT) / (_WIDE_AT - _NARROW_AT)


def score_poses(landmarks: list[Landmark] | None) -> dict[str, float]:
    """Normalised score per pose (sums to 1). No detected pose -> a flat
    distribution, which the joint assignment treats as "no signal"."""
    if not landmarks or len(landmarks) < RIGHT_SHOULDER + 1:
        return {pose: 1 / 3 for pose in POSES}

    f = _features(landmarks)
    frontal = _frontality(f["body_width"])
    asymmetry = _clamp01(f["asymmetry"])
    nose_side = _clamp01(
        (f["nose_offset"] - _NOSE_OFFSET_MIN) / _NOSE_OFFSET_SPAN
    )
    side_evidence = max(1 - frontal, asymmetry, nose_side)

    side = side_evidence
    # Whatever confidence is left over is split between front and back by
    # how visible the face is.
    facing = (1 - side_evidence) * frontal
    front = facing * _clamp01(f["face_vis"])
    back = facing * _clamp01(1 - f["face_vis"])

    raw = {"front": front, "side": side, "back": back}
    total = sum(raw.values())
    if total <= 0:
        return {pose: 1 / 3 for pose in POSES}
    return {pose: value / total for pose, value in raw.items()}
