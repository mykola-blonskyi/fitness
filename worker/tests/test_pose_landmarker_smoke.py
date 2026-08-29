"""End-to-end check that the real MediaPipe model loads and drives the
geometry heuristic. Skipped when the model can't be obtained (e.g. an
offline test run with no cached copy)."""

from pathlib import Path

import pytest

from app.pose_geometry import score_poses

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def detect():
    from app import pose_landmarker

    try:
        pose_landmarker.model_path()
    except Exception as exc:  # network failure, no cache
        pytest.skip(f"pose landmarker model unavailable: {exc}")
    return pose_landmarker.detect_landmarks


def test_detects_a_pose_and_scores_front_for_the_frontal_fixture(detect):
    landmarks = detect((FIXTURES / "front.jpg").read_bytes())

    assert landmarks is not None
    assert len(landmarks) == 33
    scores = score_poses(landmarks)
    assert abs(sum(scores.values()) - 1.0) < 1e-9
    assert max(scores, key=scores.get) == "front"
