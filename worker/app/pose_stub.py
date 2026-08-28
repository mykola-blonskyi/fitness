from typing import TypedDict

PHOTO_POSES = ("front", "side", "back")


class StubPoseResult(TypedDict):
    photo_id: str
    pose: str
    pose_landmarks: list


def assign_stub_poses(
    photo_ids: list[str], existing_poses: dict[str, str | None] | None = None
) -> list[StubPoseResult]:
    """Deterministic placeholder for the real MediaPipe joint-assignment
    heuristic (ADR-013). Today's upload flow still labels pose per photo, so
    an already-set pose is kept as-is rather than clobbered by the cycling
    guess below - the cycle only fills in photos with no pose yet, which is
    what FITNESS-49's label-free upload will produce. No landmark data yet,
    so `pose_landmarks` is always empty.
    """
    existing_poses = existing_poses or {}
    used = {pose for pose in existing_poses.values() if pose}
    fallback_poses = [pose for pose in PHOTO_POSES if pose not in used]

    results = []
    for photo_id in photo_ids:
        pose = existing_poses.get(photo_id) or fallback_poses.pop(0)
        results.append({"photo_id": photo_id, "pose": pose, "pose_landmarks": []})
    return results
