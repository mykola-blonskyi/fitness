from minio import Minio
from minio.error import S3Error

from . import config
from .errors import PermanentJobError

_client = Minio(
    f"{config.MINIO_ENDPOINT}:{config.MINIO_PORT}"
    if config.MINIO_PORT
    else config.MINIO_ENDPOINT,
    access_key=config.MINIO_ACCESS_KEY,
    secret_key=config.MINIO_SECRET_KEY,
    secure=config.MINIO_USE_SSL,
)


def read_object(object_key: str) -> bytes:
    """Direct, credentialed MinIO read, no presigned URL - the worker is a
    trusted internal service (business-rules.md)."""
    try:
        response = _client.get_object(config.MINIO_BUCKET, object_key)
    except S3Error as err:
        # A missing object or bucket never appears on a retry; everything
        # else (auth, timeouts, 5xx) can, and stays transient.
        if err.code in ("NoSuchKey", "NoSuchBucket"):
            raise PermanentJobError(
                f"{object_key} is not in the photo bucket"
            ) from err
        raise
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()
