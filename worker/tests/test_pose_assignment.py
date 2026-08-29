import pytest

from app.pose_assignment import assign


def _entry(photo_id, front, side, back):
    return {
        "photo_id": photo_id,
        "scores": {"front": front, "side": side, "back": back},
    }


def test_three_unambiguous_photos_map_to_their_best_pose():
    result = assign(
        [
            _entry("a", 0.9, 0.05, 0.05),
            _entry("b", 0.1, 0.8, 0.1),
            _entry("c", 0.1, 0.2, 0.7),
        ]
    )
    assert {r["photo_id"]: r["pose"] for r in result} == {
        "a": "front",
        "b": "side",
        "c": "back",
    }


def test_joint_optimum_beats_greedy_per_photo():
    # Both a and b score "front" highest, but the total is maximised by
    # giving front to a and side to b.
    result = assign(
        [
            _entry("a", 0.9, 0.1, 0.0),
            _entry("b", 0.6, 0.55, 0.0),
            _entry("c", 0.0, 0.1, 0.9),
        ]
    )
    assert {r["photo_id"]: r["pose"] for r in result} == {
        "a": "front",
        "b": "side",
        "c": "back",
    }


def test_preserves_input_order_and_reports_confidence():
    result = assign([_entry("only", 0.2, 0.7, 0.1)])
    assert result == [{"photo_id": "only", "pose": "side", "confidence": 0.7}]


def test_two_photos_use_two_distinct_poses():
    result = assign(
        [_entry("a", 0.8, 0.1, 0.1), _entry("b", 0.7, 0.2, 0.1)]
    )
    assert [r["pose"] for r in result] == ["front", "side"]


def test_empty_input():
    assert assign([]) == []


def test_more_than_three_photos_is_rejected():
    with pytest.raises(ValueError):
        assign([_entry(str(i), 0.3, 0.3, 0.3) for i in range(4)])
