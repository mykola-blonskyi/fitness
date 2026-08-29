import json

import psycopg

from . import config


def write_detect_result(session_id: str, results: list[dict]) -> None:
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


def fetch_landmarks(photo_id: str) -> list | None:
    with psycopg.connect(config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pose_landmarks FROM progress_photos WHERE id = %s",
                (photo_id,),
            )
            row = cur.fetchone()
    if not row or row[0] is None:
        return None
    # psycopg decodes jsonb to a Python object already; tolerate a raw
    # string too.
    return row[0] if isinstance(row[0], list) else json.loads(row[0])


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
