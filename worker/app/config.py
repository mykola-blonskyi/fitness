import os

REDIS_URL = os.environ["REDIS_URL"]
QUEUE_KEY = "photo_analysis_jobs"
BRPOP_TIMEOUT_SECONDS = 5

DATABASE_URL = os.environ["DATABASE_URL"]

MINIO_ENDPOINT = os.environ["MINIO_ENDPOINT"]
MINIO_PORT = int(os.environ["MINIO_PORT"]) if os.environ.get("MINIO_PORT") else None
MINIO_USE_SSL = os.environ.get("MINIO_USE_SSL", "true") != "false"
MINIO_ACCESS_KEY = os.environ["MINIO_ACCESS_KEY"]
MINIO_SECRET_KEY = os.environ["MINIO_SECRET_KEY"]
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "fitness-progress-photos")

JOB_MAX_ATTEMPTS = 3
JOB_RETRY_BACKOFF_SECONDS = 2
