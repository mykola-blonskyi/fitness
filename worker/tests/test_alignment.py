import pytest

from app.alignment import PoseNotDetectedError, analyze_alignment


def _landmarks(overrides: dict) -> list[dict]:
    base = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0} for _ in range(33)]
    for idx, attrs in overrides.items():
        base[idx].update(attrs)
    return base


ALIGNED_FRONT = _landmarks(
    {
        0: {"x": 0.50, "y": 0.15},  # nose
        2: {"y": 0.13},
        5: {"y": 0.13},
        7: {"y": 0.14},
        8: {"y": 0.14},
        11: {"x": 0.60, "y": 0.40},
        12: {"x": 0.40, "y": 0.40},
        23: {"x": 0.58, "y": 0.72},
        24: {"x": 0.42, "y": 0.72},
    }
)

TILTED_SHOULDERS_FRONT = _landmarks(
    {
        0: {"x": 0.50, "y": 0.15},
        11: {"x": 0.60, "y": 0.33},
        12: {"x": 0.40, "y": 0.47},
        23: {"x": 0.58, "y": 0.72},
        24: {"x": 0.42, "y": 0.72},
    }
)


def _check(result: dict, name: str) -> dict:
    return next(c for c in result["checks"] if c["name"] == name)


def test_clear_front_passes_every_check():
    result = analyze_alignment("front", ALIGNED_FRONT)

    assert result["pose"] == "front"
    assert result["aligned"] is True
    assert result["landmark_count"] == 33
    assert all(c["passed"] for c in result["checks"])


def test_tilted_shoulders_front_fails_only_shoulders_level():
    result = analyze_alignment("front", TILTED_SHOULDERS_FRONT)

    assert result["aligned"] is False
    assert _check(result, "shoulders_level")["passed"] is False
    failed = [c["name"] for c in result["checks"] if not c["passed"]]
    assert failed == ["shoulders_level"]


def test_front_landmarks_scored_as_side_fail_true_profile():
    result = analyze_alignment("side", ALIGNED_FRONT)

    assert result["aligned"] is False
    assert _check(result, "true_profile")["passed"] is False


def test_deterministic():
    assert analyze_alignment("front", ALIGNED_FRONT) == analyze_alignment(
        "front", ALIGNED_FRONT
    )


@pytest.mark.parametrize("landmarks", [None, [], [{"x": 0.1, "y": 0.1}]])
def test_missing_or_too_few_landmarks_is_permanent(landmarks):
    with pytest.raises(PoseNotDetectedError):
        analyze_alignment("front", landmarks)
