import pytest
from minio.error import S3Error

from app import pose_landmarker, storage
from app.errors import PermanentJobError


def _s3_error(code: str) -> S3Error:
    return S3Error(code, "message", "resource", "request-id", "host-id", None)


def test_a_missing_object_is_permanent(monkeypatch):
    class Client:
        def get_object(self, bucket, key):
            raise _s3_error("NoSuchKey")

    monkeypatch.setattr(storage, "_client", Client())

    with pytest.raises(PermanentJobError):
        storage.read_object("sessions/s1/p1.jpg")


def test_a_transport_failure_stays_retryable(monkeypatch):
    class Client:
        def get_object(self, bucket, key):
            raise _s3_error("InternalError")

    monkeypatch.setattr(storage, "_client", Client())

    with pytest.raises(S3Error):
        storage.read_object("sessions/s1/p1.jpg")


def test_an_undecodable_photo_is_permanent():
    with pytest.raises(PermanentJobError):
        pose_landmarker.detect_landmarks(b"ftypheic-but-not-really")
