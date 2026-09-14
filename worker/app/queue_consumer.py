import json
import logging
import time

import redis

from . import config
from .analyze_alignment_job import (
    mark_analyze_alignment_failed,
    process_analyze_alignment_job,
)
from .detect_job import mark_detect_failed, process_detect_job
from .errors import PermanentJobError

logger = logging.getLogger(__name__)

JOB_HANDLERS = {
    "detect": process_detect_job,
    "analyze-alignment": process_analyze_alignment_job,
}

JOB_FAILURE_HANDLERS = {
    "analyze-alignment": mark_analyze_alignment_failed,
    "detect": mark_detect_failed,
}

_last_tick = time.monotonic()
_job_in_flight = False


def is_consuming() -> bool:
    return (
        _job_in_flight
        or time.monotonic() - _last_tick < config.CONSUMER_STALE_AFTER_SECONDS
    )


def _process_with_retry(job: dict) -> None:
    handler = JOB_HANDLERS.get(job.get("type"))
    if handler is None:
        logger.error("unknown job type: %s", job.get("type"))
        return

    for attempt in range(1, config.JOB_MAX_ATTEMPTS + 1):
        try:
            handler(job)
            return
        except PermanentJobError:
            logger.exception("job cannot be retried, failing immediately: %s", job)
            break
        except Exception:
            logger.exception(
                "job attempt %d/%d failed for %s",
                attempt,
                config.JOB_MAX_ATTEMPTS,
                job,
            )
            if attempt < config.JOB_MAX_ATTEMPTS:
                time.sleep(config.JOB_RETRY_BACKOFF_SECONDS * attempt)
    else:
        logger.error(
            "job permanently failed after %d attempts: %s",
            config.JOB_MAX_ATTEMPTS,
            job,
        )

    failure_handler = JOB_FAILURE_HANDLERS.get(job.get("type"))
    if failure_handler is not None:
        try:
            failure_handler(job)
        except Exception:
            logger.exception("failure handler errored for %s", job)


def consume_forever() -> None:
    global _last_tick, _job_in_flight
    # No socket_timeout: redis-py applies it to BRPOP's own response wait,
    # where it would race BRPOP_TIMEOUT_SECONDS and raise instead of returning.
    client = redis.Redis.from_url(
        config.REDIS_URL,
        socket_connect_timeout=config.REDIS_CONNECT_TIMEOUT_SECONDS,
    )
    logger.info("photo-analysis queue consumer started")
    while True:
        _last_tick = time.monotonic()
        try:
            item = client.brpop(
                [config.QUEUE_KEY], timeout=config.BRPOP_TIMEOUT_SECONDS
            )
            if item is None:
                continue
            _, payload = item
            try:
                job = json.loads(payload)
            except json.JSONDecodeError:
                logger.exception("dropping malformed job payload: %r", payload)
                continue
            _job_in_flight = True
            try:
                _process_with_retry(job)
            finally:
                _job_in_flight = False
        except Exception:
            logger.exception("queue consumer loop failed, backing off")
            time.sleep(config.CONSUMER_ERROR_BACKOFF_SECONDS)
