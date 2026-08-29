from app import analyze_alignment_job as mod


def test_processing_then_read_then_completed(monkeypatch):
    calls = []
    monkeypatch.setattr(mod.db, "set_analysis_status", lambda pid, s: calls.append((pid, s)))
    monkeypatch.setattr(mod.storage, "read_object", lambda key: calls.append(("read", key)))
    monkeypatch.setattr(
        mod.db,
        "write_alignment_result",
        lambda pid, data: calls.append(("write", pid, data["pose"])),
    )

    mod.process_analyze_alignment_job(
        {"photoId": "p1", "objectKey": "k1", "pose": "back"}
    )

    assert calls == [
        ("p1", "processing"),
        ("read", "k1"),
        ("write", "p1", "back"),
    ]


def test_failure_hook_marks_photo_failed(monkeypatch):
    calls = []
    monkeypatch.setattr(mod.db, "set_analysis_status", lambda pid, s: calls.append((pid, s)))

    mod.mark_analyze_alignment_failed({"photoId": "p9", "objectKey": "k", "pose": "front"})

    assert calls == [("p9", "failed")]
