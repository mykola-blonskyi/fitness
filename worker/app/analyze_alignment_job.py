import logging

from . import db
from .alignment import analyze_alignment

logger = logging.getLogger(__name__)


def process_analyze_alignment_job(job: dict) -> None:
    photo_id = job["photoId"]
    db.set_analysis_status(photo_id, "processing")
    # Landmarks come from the detect stage; MediaPipe is never re-run here (ADR-013).
    landmarks = db.fetch_landmarks(photo_id)
    result = analyze_alignment(job["pose"], landmarks)
    db.write_alignment_result(photo_id, result)
    logger.info(
        "alignment analysis complete for photo %s: aligned=%s",
        photo_id,
        result["aligned"],
    )


def mark_analyze_alignment_failed(job: dict) -> None:
    db.set_analysis_status(job["photoId"], "failed")
