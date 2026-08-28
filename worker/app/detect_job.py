import logging

from . import db, storage
from .pose_stub import assign_stub_poses

logger = logging.getLogger(__name__)


def process_detect_job(job: dict) -> None:
    session_id = job["sessionId"]
    photos = job["photos"]

    # Read every object up front so a missing photo fails the job before
    # any DB write, rather than leaving a session partially updated.
    for photo in photos:
        storage.read_object(photo["objectKey"])

    photo_ids = [photo["photoId"] for photo in photos]
    existing_poses = db.fetch_poses(photo_ids)
    results = assign_stub_poses(photo_ids, existing_poses)
    db.write_detect_result(session_id, results)
    logger.info("detect job complete for session %s", session_id)
