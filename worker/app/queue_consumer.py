import json
import logging
import time

import redis

from . import config
from .analyze_alignment_job import (
    mark_analyze_alignment_failed,
    process_analyze_alignment_job,
)
from .detect_job import process_detect_job

logger = logging.getLogger(__name__)

JOB_HANDLERS = {
    "detect": process_detect_job,
    "analyze-alignment": process_analyze_alignment_job,
}

# Optional per-type hook run once a job has exhausted its retries, so the
# permanent failure is recorded somewhere the user can see it.
JOB_FAILURE_HANDLERS = {"analyze-alignment": mark_analyze_alignment_failed}


def _process_with_retry(job: dict) -> None:
    handler = JOB_HANDLERS.get(job.get("type"))
    if handler is None:
        logger.error("unknown job type: %s", job.get("type"))
        return

    for attempt in range(1, config.JOB_MAX_ATTEMPTS + 1):
        try:
            handler(job)
            return
        except Exception:
            logger.exception(
                "job attempt %d/%d failed for %s",
                attempt,
                config.JOB_MAX_ATTEMPTS,
                job,
            )
            if attempt < config.JOB_MAX_ATTEMPTS:
                time.sleep(config.JOB_RETRY_BACKOFF_SECONDS * attempt)

    logger.error(
        "job permanently failed after %d attempts: %s", config.JOB_MAX_ATTEMPTS, job
    )
    failure_handler = JOB_FAILURE_HANDLERS.get(job.get("type"))
    if failure_handler is not None:
        try:
            failure_handler(job)
        except Exception:
            logger.exception("failure handler errored for %s", job)


def consume_forever() -> None:
    client = redis.Redis.from_url(config.REDIS_URL)
    logger.info("photo-analysis queue consumer started")
    while True:
        item = client.brpop([config.QUEUE_KEY], timeout=config.BRPOP_TIMEOUT_SECONDS)
        if item is None:
            continue
        _, payload = item
        try:
            job = json.loads(payload)
        except json.JSONDecodeError:
            logger.exception("dropping malformed job payload: %r", payload)
            continue
        _process_with_retry(job)
