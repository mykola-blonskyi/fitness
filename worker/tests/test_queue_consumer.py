from app import queue_consumer


def _always_raises(job):
    raise RuntimeError("boom")


def test_unknown_job_type_is_dropped():
    # No handler, no failure hook - must return without raising.
    queue_consumer._process_with_retry({"type": "mystery"})


def test_successful_job_runs_once(monkeypatch):
    calls = []
    monkeypatch.setitem(
        queue_consumer.JOB_HANDLERS, "detect", lambda job: calls.append(job)
    )

    queue_consumer._process_with_retry({"type": "detect", "sessionId": "s1"})

    assert calls == [{"type": "detect", "sessionId": "s1"}]


def test_transient_failure_is_retried_then_succeeds(monkeypatch):
    monkeypatch.setattr(queue_consumer.time, "sleep", lambda _seconds: None)
    attempts = []

    def handler(job):
        attempts.append(job)
        if len(attempts) < 2:
            raise RuntimeError("transient")

    monkeypatch.setitem(queue_consumer.JOB_HANDLERS, "detect", handler)

    queue_consumer._process_with_retry({"type": "detect"})

    assert len(attempts) == 2


def test_permanent_failure_invokes_the_failure_hook(monkeypatch):
    monkeypatch.setattr(queue_consumer.time, "sleep", lambda _seconds: None)
    failed = []
    monkeypatch.setitem(
        queue_consumer.JOB_HANDLERS, "analyze-alignment", _always_raises
    )
    monkeypatch.setitem(
        queue_consumer.JOB_FAILURE_HANDLERS,
        "analyze-alignment",
        lambda job: failed.append(job),
    )

    job = {"type": "analyze-alignment", "photoId": "p1"}
    queue_consumer._process_with_retry(job)

    assert failed == [job]


def test_detect_has_no_failure_hook(monkeypatch):
    monkeypatch.setattr(queue_consumer.time, "sleep", lambda _seconds: None)
    monkeypatch.setitem(queue_consumer.JOB_HANDLERS, "detect", _always_raises)

    # Must not raise even though there's no failure hook for `detect`.
    queue_consumer._process_with_retry({"type": "detect"})
