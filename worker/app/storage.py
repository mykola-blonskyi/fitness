from minio import Minio

from . import config

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
    response = _client.get_object(config.MINIO_BUCKET, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()
