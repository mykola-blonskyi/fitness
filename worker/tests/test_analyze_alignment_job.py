from app import analyze_alignment_job as mod


def test_processing_then_landmark_read_then_completed(monkeypatch):
    calls = []
    monkeypatch.setattr(
        mod.db, "set_analysis_status", lambda pid, s: calls.append((pid, s))
    )
    monkeypatch.setattr(
        mod.db,
        "fetch_landmarks",
        lambda pid: calls.append(("fetch", pid)) or [{"x": 0.1}],
    )
    monkeypatch.setattr(
        mod.db,
        "write_alignment_result",
        lambda pid, data: calls.append(
            ("write", pid, data["pose"], data["landmark_count"])
        ),
    )

    mod.process_analyze_alignment_job(
        {"photoId": "p1", "objectKey": "k1", "pose": "back"}
    )

    assert calls == [
        ("p1", "processing"),
        ("fetch", "p1"),
        ("write", "p1", "back", 1),
    ]


def test_failure_hook_marks_photo_failed(monkeypatch):
    calls = []
    monkeypatch.setattr(
        mod.db, "set_analysis_status", lambda pid, s: calls.append((pid, s))
    )

    mod.mark_analyze_alignment_failed(
        {"photoId": "p9", "objectKey": "k", "pose": "front"}
    )

    assert calls == [("p9", "failed")]
