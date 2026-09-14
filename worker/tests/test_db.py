import pytest

from app import db


class FakeCursor:
    def __init__(self, rowcount):
        self.rowcount = rowcount
        self.calls = []

    def execute(self, sql, params):
        self.calls.append((" ".join(sql.split()), params))

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConnection:
    def __init__(self, rowcount):
        self.cur = FakeCursor(rowcount)
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self.cur

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


@pytest.fixture
def connect(monkeypatch):
    def factory(rowcount):
        conn = FakeConnection(rowcount)
        monkeypatch.setattr(db.psycopg, "connect", lambda url: conn)
        return conn

    return factory


RESULTS = [
    {"photo_id": "p1", "pose": "side", "pose_landmarks": []},
    {"photo_id": "p2", "pose": "front", "pose_landmarks": []},
]


def test_session_update_is_guarded_on_detecting(connect):
    conn = connect(1)

    db.write_detect_result("s1", RESULTS)

    sql, params = conn.cur.calls[0]
    assert "UPDATE photo_sessions" in sql
    assert "WHERE id = %s AND status = 'detecting'" in sql
    assert params == ("s1",)


def test_no_photo_is_touched_when_the_session_left_detecting(connect):
    conn = connect(0)

    db.write_detect_result("s1", RESULTS)

    assert [sql for sql, _ in conn.cur.calls if "progress_photos" in sql] == []
    assert conn.rolled_back
    assert not conn.committed


def test_every_pose_is_nulled_before_any_is_assigned(connect):
    conn = connect(1)

    db.write_detect_result("s1", RESULTS)

    photo_writes = [
        (sql, params) for sql, params in conn.cur.calls if "progress_photos" in sql
    ]
    assert [params for sql, params in photo_writes if "pose = NULL" in sql] == [
        ("p1",),
        ("p2",),
    ]
    assert all("pose = NULL" in sql for sql, _ in photo_writes[:2])
    assert [params[0] for _, params in photo_writes[2:]] == ["side", "front"]
    assert conn.committed


def test_clear_detect_result_nulls_poses_under_the_same_guard(connect):
    conn = connect(1)

    db.clear_detect_result("s1", ["p1", "p2"])

    guard_sql, guard_params = conn.cur.calls[0]
    assert "WHERE id = %s AND status = 'detecting'" in guard_sql
    assert guard_params == ("s1",)
    assert conn.cur.calls[1:] == [
        ("UPDATE progress_photos SET pose = NULL WHERE id = %s", ("p1",)),
        ("UPDATE progress_photos SET pose = NULL WHERE id = %s", ("p2",)),
    ]
    assert conn.committed


def test_clear_detect_result_is_a_no_op_once_the_session_left_detecting(connect):
    conn = connect(0)

    db.clear_detect_result("s1", ["p1"])

    assert len(conn.cur.calls) == 1
    assert conn.rolled_back
    assert not conn.committed
