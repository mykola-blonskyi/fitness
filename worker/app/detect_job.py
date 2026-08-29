import logging

from . import db, storage
from .pose_assignment import assign
from .pose_geometry import score_poses
from .pose_landmarker import detect_landmarks

logger = logging.getLogger(__name__)


def process_detect_job(job: dict) -> None:
    session_id = job["sessionId"]
    photos = job["photos"]

    # Read + run detection on every photo up front so a missing object or a
    # decode failure fails the job before any DB write.
    landmarks_by_photo: dict[str, list | None] = {}
    scores_per_photo = []
    for photo in photos:
        landmarks = detect_landmarks(storage.read_object(photo["objectKey"]))
        landmarks_by_photo[photo["photoId"]] = landmarks
        scores_per_photo.append(
            {"photo_id": photo["photoId"], "scores": score_poses(landmarks)}
        )

    assignment = assign(scores_per_photo)

    db.write_detect_result(
        session_id,
        [
            {
                "photo_id": a["photo_id"],
                "pose": a["pose"],
                "pose_landmarks": landmarks_by_photo[a["photo_id"]] or [],
            }
            for a in assignment
        ],
    )
    logger.info(
        "detect complete for session %s: %s",
        session_id,
        {a["photo_id"]: (a["pose"], round(a["confidence"], 2)) for a in assignment},
    )
