import logging

from . import db, storage
from .alignment_stub import build_stub_alignment

logger = logging.getLogger(__name__)


def process_analyze_alignment_job(job: dict) -> None:
    photo_id = job["photoId"]
    db.set_analysis_status(photo_id, "processing")
    # Real credentialed read so the job exercises the full pipe even while
    # the analysis itself is a stub.
    storage.read_object(job["objectKey"])
    db.write_alignment_result(photo_id, build_stub_alignment(job["pose"]))
    logger.info("alignment analysis complete for photo %s", photo_id)


def mark_analyze_alignment_failed(job: dict) -> None:
    db.set_analysis_status(job["photoId"], "failed")
