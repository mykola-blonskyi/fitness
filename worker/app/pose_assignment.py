"""Joint front/side/back assignment across a session's photos.

Classifying each photo in isolation can hand the same pose to two photos.
Instead we score every photo against every pose (pose_geometry.score_poses)
and pick the whole-session assignment that maximises total confidence with
each pose used at most once. With <=3 photos this is just a search over the
few permutations.
"""

from __future__ import annotations

from itertools import permutations

from .pose_geometry import POSES


def assign(scores_per_photo: list[dict]) -> list[dict]:
    """`scores_per_photo`: [{"photo_id": str, "scores": {pose: float}}].
    Returns [{"photo_id", "pose", "confidence"}] in the input order."""
    n = len(scores_per_photo)
    if n == 0:
        return []
    if n > len(POSES):
        raise ValueError(f"cannot assign {n} photos to {len(POSES)} poses")

    best_total = float("-inf")
    best: tuple[str, ...] = ()
    for combo in permutations(POSES, n):
        total = sum(
            entry["scores"][pose]
            for entry, pose in zip(scores_per_photo, combo)
        )
        if total > best_total:
            best_total = total
            best = combo

    return [
        {
            "photo_id": entry["photo_id"],
            "pose": pose,
            "confidence": entry["scores"][pose],
        }
        for entry, pose in zip(scores_per_photo, best)
    ]
