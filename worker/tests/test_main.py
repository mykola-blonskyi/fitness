import pytest
from fastapi import HTTPException

from app import main, queue_consumer


class _Thread:
    def __init__(self, alive):
        self._alive = alive

    def is_alive(self):
        return self._alive


@pytest.fixture(autouse=True)
def consuming(monkeypatch):
    monkeypatch.setattr(queue_consumer, "is_consuming", lambda: True)


def test_health_is_ok_while_the_consumer_runs(monkeypatch):
    monkeypatch.setattr(main, "_consumer_thread", _Thread(alive=True))

    assert main.health() == {"status": "ok"}


@pytest.mark.parametrize("thread", [None, _Thread(alive=False)])
def test_health_fails_when_the_consumer_thread_is_gone(monkeypatch, thread):
    monkeypatch.setattr(main, "_consumer_thread", thread)

    with pytest.raises(HTTPException) as exc:
        main.health()
    assert exc.value.status_code == 503


def test_health_fails_when_a_live_thread_stops_making_progress(monkeypatch):
    monkeypatch.setattr(main, "_consumer_thread", _Thread(alive=True))
    monkeypatch.setattr(queue_consumer, "is_consuming", lambda: False)

    with pytest.raises(HTTPException) as exc:
        main.health()
    assert exc.value.status_code == 503
