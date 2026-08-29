from app.alignment_stub import build_stub_alignment


def test_result_is_pose_tagged_and_deterministic():
    result = build_stub_alignment("side")

    assert result["pose"] == "side"
    assert result == build_stub_alignment("side")


def test_result_marks_itself_a_stub():
    assert build_stub_alignment("front")["stub"] is True
