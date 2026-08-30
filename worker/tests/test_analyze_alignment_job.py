import pytest

from app import analyze_alignment_job as mod
from app.alignment import PoseNotDetectedError


def _landmarks() -> list[dict]:
    base = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0} for _ in range(33)]
    base[0].update({"x": 0.5, "y": 0.15})
    base[11].update({"x": 0.6, "y": 0.4})
    base[12].update({"x": 0.4, "y": 0.4})
    base[23].update({"x": 0.58, "y": 0.72})
    base[24].update({"x": 0.42, "y": 0.72})
    return base


def test_processing_then_landmark_read_then_completed(monkeypatch):
    calls = []
    monkeypatch.setattr(
        mod.db, "set_analysis_status", lambda pid, s: calls.append((pid, s))
    )
    monkeypatch.setattr(
        mod.db,
        "fetch_landmarks",
        lambda pid: calls.append(("fetch", pid)) or _landmarks(),
    )
    monkeypatch.setattr(
        mod.db,
        "write_alignment_result",
        lambda pid, data: calls.append(
            ("write", pid, data["pose"], data["aligned"])
        ),
    )

    mod.process_analyze_alignment_job(
        {"photoId": "p1", "objectKey": "k1", "pose": "front"}
    )

    assert calls == [
        ("p1", "processing"),
        ("fetch", "p1"),
        ("write", "p1", "front", True),
    ]


def test_missing_landmarks_raises_permanent_error(monkeypatch):
    monkeypatch.setattr(mod.db, "set_analysis_status", lambda pid, s: None)
    monkeypatch.setattr(mod.db, "fetch_landmarks", lambda pid: None)
    monkeypatch.setattr(
        mod.db,
        "write_alignment_result",
        lambda pid, data: pytest.fail("must not persist a result"),
    )

    with pytest.raises(PoseNotDetectedError):
        mod.process_analyze_alignment_job(
            {"photoId": "p2", "objectKey": "k", "pose": "side"}
        )


def test_failure_hook_marks_photo_failed(monkeypatch):
    calls = []
    monkeypatch.setattr(
        mod.db, "set_analysis_status", lambda pid, s: calls.append((pid, s))
    )

    mod.mark_analyze_alignment_failed(
        {"photoId": "p9", "objectKey": "k", "pose": "front"}
    )

    assert calls == [("p9", "failed")]
