import json
import logging

import psycopg

from . import config

logger = logging.getLogger(__name__)

# Guarded on `detecting` so a redelivered job cannot pull a reviewed session back.
_LEAVE_DETECTING_SQL = """
    UPDATE photo_sessions
    SET status = 'needs_review', updated_at = now()
    WHERE id = %s AND status = 'detecting'
"""

_CLEAR_POSE_SQL = "UPDATE progress_photos SET pose = NULL WHERE id = %s"


def _connect() -> psycopg.Connection:
    return psycopg.connect(
        config.DATABASE_URL,
        connect_timeout=config.DB_CONNECT_TIMEOUT_SECONDS,
        options=f"-c statement_timeout={config.DB_STATEMENT_TIMEOUT_MS}",
    )


def write_detect_result(session_id: str, results: list[dict]) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(_LEAVE_DETECTING_SQL, (session_id,))
            if cur.rowcount == 0:
                logger.info(
                    "session %s is no longer detecting, dropping detect result",
                    session_id,
                )
                conn.rollback()
                return
            # The (photo_session_id, pose) unique index is checked per statement,
            # so a swapped pair has to pass through null.
            for result in results:
                cur.execute(_CLEAR_POSE_SQL, (result["photo_id"],))
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
        conn.commit()


def clear_detect_result(session_id: str, photo_ids: list[str]) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(_LEAVE_DETECTING_SQL, (session_id,))
            if cur.rowcount == 0:
                conn.rollback()
                return
            for photo_id in photo_ids:
                cur.execute(_CLEAR_POSE_SQL, (photo_id,))
        conn.commit()


def fetch_landmarks(photo_id: str) -> list | None:
    with _connect() as conn:
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
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE progress_photos SET analysis_status = %s WHERE id = %s",
                (status, photo_id),
            )
        conn.commit()


def write_alignment_result(photo_id: str, alignment_data: dict) -> None:
    with _connect() as conn:
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
