import time

import pytest
import redis

from app import db as detect_job_db
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


def test_exhausted_retries_invoke_the_failure_hook(monkeypatch):
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


def test_permanent_job_error_skips_retry_and_fails_once(monkeypatch):
    slept = []
    monkeypatch.setattr(
        queue_consumer.time, "sleep", lambda seconds: slept.append(seconds)
    )
    attempts, failed = [], []

    def handler(job):
        attempts.append(job)
        raise queue_consumer.PermanentJobError("bad landmarks")

    monkeypatch.setitem(queue_consumer.JOB_HANDLERS, "analyze-alignment", handler)
    monkeypatch.setitem(
        queue_consumer.JOB_FAILURE_HANDLERS,
        "analyze-alignment",
        lambda job: failed.append(job),
    )

    job = {"type": "analyze-alignment", "photoId": "p1"}
    queue_consumer._process_with_retry(job)

    assert len(attempts) == 1
    assert failed == [job]
    assert slept == []


def test_exhausted_detect_lands_the_session_in_needs_review(monkeypatch):
    monkeypatch.setattr(queue_consumer.time, "sleep", lambda _seconds: None)
    cleared = []
    monkeypatch.setitem(queue_consumer.JOB_HANDLERS, "detect", _always_raises)
    monkeypatch.setattr(
        detect_job_db,
        "clear_detect_result",
        lambda session_id, photo_ids: cleared.append((session_id, photo_ids)),
    )

    queue_consumer._process_with_retry(
        {
            "type": "detect",
            "sessionId": "s1",
            "photos": [{"photoId": "p1"}, {"photoId": "p2"}],
        }
    )

    assert cleared == [("s1", ["p1", "p2"])]


class _FakeRedis:
    def __init__(self, outcomes):
        self._outcomes = list(outcomes)
        self.calls = 0

    def brpop(self, keys, timeout):
        self.calls += 1
        outcome = self._outcomes.pop(0)
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome


def _run_loop(monkeypatch, outcomes):
    client = _FakeRedis([*outcomes, KeyboardInterrupt()])
    monkeypatch.setattr(
        queue_consumer.redis.Redis, "from_url", staticmethod(lambda url: client)
    )
    slept = []
    monkeypatch.setattr(
        queue_consumer.time, "sleep", lambda seconds: slept.append(seconds)
    )
    with pytest.raises(KeyboardInterrupt):
        queue_consumer.consume_forever()
    return client, slept


def test_loop_survives_a_redis_error_and_keeps_consuming(monkeypatch):
    client, slept = _run_loop(monkeypatch, [redis.ConnectionError("redis restarted")])

    assert client.calls == 2
    assert slept == [queue_consumer.config.CONSUMER_ERROR_BACKOFF_SECONDS]


def test_the_tick_advances_on_every_poll(monkeypatch):
    monkeypatch.setattr(queue_consumer, "_last_tick", 0.0)

    _run_loop(monkeypatch, [None])

    assert queue_consumer.is_consuming()


def test_a_stalled_loop_stops_reporting_as_consuming(monkeypatch):
    monkeypatch.setattr(queue_consumer, "_job_in_flight", False)
    monkeypatch.setattr(
        queue_consumer,
        "_last_tick",
        time.monotonic() - queue_consumer.config.CONSUMER_STALE_AFTER_SECONDS - 1,
    )

    assert not queue_consumer.is_consuming()


def test_a_long_running_job_still_counts_as_consuming(monkeypatch):
    monkeypatch.setattr(queue_consumer, "_job_in_flight", True)
    monkeypatch.setattr(queue_consumer, "_last_tick", 0.0)

    assert queue_consumer.is_consuming()
