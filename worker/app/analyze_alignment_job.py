import logging

from . import db
from .alignment_stub import build_stub_alignment

logger = logging.getLogger(__name__)


def process_analyze_alignment_job(job: dict) -> None:
    photo_id = job["photoId"]
    db.set_analysis_status(photo_id, "processing")
    # Reuse the landmarks the detect stage already computed - the alignment
    # stage never re-runs MediaPipe or re-reads the object (ADR-013).
    landmarks = db.fetch_landmarks(photo_id)
    db.write_alignment_result(
        photo_id, build_stub_alignment(job["pose"], landmarks)
    )
    logger.info("alignment analysis complete for photo %s", photo_id)


def mark_analyze_alignment_failed(job: dict) -> None:
    db.set_analysis_status(job["photoId"], "failed")
