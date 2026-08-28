from app.pose_stub import assign_stub_poses


def test_cycles_front_side_back_by_position():
    results = assign_stub_poses(["p1", "p2", "p3"])

    assert [r["pose"] for r in results] == ["front", "side", "back"]
    assert [r["photo_id"] for r in results] == ["p1", "p2", "p3"]


def test_landmarks_are_empty_placeholders():
    results = assign_stub_poses(["p1"])

    assert results[0]["pose_landmarks"] == []


def test_handles_fewer_than_three_photos():
    results = assign_stub_poses(["only-one"])

    assert len(results) == 1
    assert results[0]["pose"] == "front"


def test_preserves_poses_already_set_at_upload():
    results = assign_stub_poses(
        ["p1", "p2", "p3"], {"p1": "side", "p2": "front", "p3": None}
    )

    assert {r["photo_id"]: r["pose"] for r in results} == {
        "p1": "side",
        "p2": "front",
        "p3": "back",
    }
