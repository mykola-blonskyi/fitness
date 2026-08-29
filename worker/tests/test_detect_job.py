from app import detect_job


def test_writes_assigned_poses_and_real_landmarks(monkeypatch):
    landmarks = {
        "p1": [{"x": 0.1, "y": 0.2, "z": 0.0, "visibility": 1.0}],
        "p2": [{"x": 0.3, "y": 0.4, "z": 0.0, "visibility": 1.0}],
    }
    scores = {
        "p1": {"front": 0.9, "side": 0.05, "back": 0.05},
        "p2": {"front": 0.1, "side": 0.8, "back": 0.1},
    }

    monkeypatch.setattr(detect_job.storage, "read_object", lambda key: key.encode())
    monkeypatch.setattr(
        detect_job, "detect_landmarks", lambda data: landmarks[data.decode()]
    )
    monkeypatch.setattr(
        detect_job, "score_poses", lambda lm: scores[_photo_of(landmarks, lm)]
    )

    written = {}
    monkeypatch.setattr(
        detect_job.db,
        "write_detect_result",
        lambda session_id, results: written.update(
            session_id=session_id, results=results
        ),
    )

    detect_job.process_detect_job(
        {
            "sessionId": "s1",
            "photos": [
                {"photoId": "p1", "objectKey": "p1"},
                {"photoId": "p2", "objectKey": "p2"},
            ],
        }
    )

    assert written["session_id"] == "s1"
    by_id = {r["photo_id"]: r for r in written["results"]}
    assert by_id["p1"]["pose"] == "front"
    assert by_id["p2"]["pose"] == "side"
    assert by_id["p1"]["pose_landmarks"] == landmarks["p1"]


def test_missing_pose_persists_empty_landmarks(monkeypatch):
    monkeypatch.setattr(detect_job.storage, "read_object", lambda key: b"x")
    monkeypatch.setattr(detect_job, "detect_landmarks", lambda data: None)
    written = {}
    monkeypatch.setattr(
        detect_job.db,
        "write_detect_result",
        lambda session_id, results: written.update(results=results),
    )

    detect_job.process_detect_job(
        {"sessionId": "s1", "photos": [{"photoId": "p1", "objectKey": "k"}]}
    )

    assert written["results"][0]["pose_landmarks"] == []


def _photo_of(landmarks_by_photo, lm):
    for photo_id, value in landmarks_by_photo.items():
        if value is lm:
            return photo_id
    raise AssertionError("unexpected landmarks")
