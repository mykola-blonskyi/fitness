from app.pose_geometry import POSES, score_poses


def _landmarks(overrides: dict) -> list[dict]:
    """33 neutral landmarks (centred, fully visible), with per-index
    overrides for the ones the heuristic looks at."""
    base = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0} for _ in range(33)]
    for idx, attrs in overrides.items():
        base[idx].update(attrs)
    return base


FRONT = _landmarks(
    {
        11: {"x": 0.62},
        12: {"x": 0.38},  # shoulder span 0.24
        23: {"x": 0.60},
        24: {"x": 0.40},
        0: {"x": 0.50},  # nose centred
    }
)

BACK = _landmarks(
    {
        11: {"x": 0.62},
        12: {"x": 0.38},
        23: {"x": 0.60},
        24: {"x": 0.40},
        0: {"x": 0.50, "visibility": 0.1},
        2: {"visibility": 0.1},
        5: {"visibility": 0.1},  # face not visible
        7: {"visibility": 0.4},
        8: {"visibility": 0.4},
    }
)

SIDE = _landmarks(
    {
        11: {"x": 0.51, "visibility": 1.0},
        12: {"x": 0.49, "visibility": 0.2},  # shoulders collapsed + asymmetric
        23: {"x": 0.51, "visibility": 1.0},
        24: {"x": 0.49, "visibility": 0.2},
        7: {"visibility": 1.0},
        8: {"visibility": 0.1},  # one ear hidden
        0: {"x": 0.72},  # nose well past the shoulder line
        5: {"visibility": 0.2},
    }
)


def _top(landmarks):
    return max(score_poses(landmarks).items(), key=lambda kv: kv[1])[0]


def test_clear_front_scores_front_highest():
    assert _top(FRONT) == "front"


def test_clear_back_scores_back_highest():
    assert _top(BACK) == "back"


def test_clear_side_scores_side_highest():
    assert _top(SIDE) == "side"


def test_scores_are_a_normalised_distribution():
    scores = score_poses(FRONT)
    assert set(scores) == set(POSES)
    assert abs(sum(scores.values()) - 1.0) < 1e-9


def test_no_landmarks_is_a_flat_distribution():
    assert score_poses(None) == {pose: 1 / 3 for pose in POSES}
