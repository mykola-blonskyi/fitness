import json

import psycopg

from . import config
from .pose_stub import StubPoseResult


def fetch_poses(photo_ids: list[str]) -> dict[str, str | None]:
    with psycopg.connect(config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, pose FROM progress_photos WHERE id = ANY(%s)",
                (photo_ids,),
            )
            return dict(cur.fetchall())


def write_detect_result(session_id: str, results: list[StubPoseResult]) -> None:
    with psycopg.connect(config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            for result in results:
                cur.execute(
                    """
                    UPDATE progress_photos
                    SET pose = %s, pose_landmarks = %s
                    WHERE id = %s
                    """,
                    (
                        result["pose"],
                        json.dumps(result["pose_landmarks"]),
                        result["photo_id"],
                    ),
                )
            cur.execute(
                """
                UPDATE photo_sessions
                SET status = 'needs_review', updated_at = now()
                WHERE id = %s
                """,
                (session_id,),
            )
        conn.commit()


def set_analysis_status(photo_id: str, status: str) -> None:
    with psycopg.connect(config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE progress_photos SET analysis_status = %s WHERE id = %s",
                (status, photo_id),
            )
        conn.commit()


def write_alignment_result(photo_id: str, alignment_data: dict) -> None:
    with psycopg.connect(config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE progress_photos
                SET alignment_data = %s, analysis_status = 'completed'
                WHERE id = %s
                """,
                (json.dumps(alignment_data), photo_id),
            )
        conn.commit()
