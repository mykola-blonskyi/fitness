def build_stub_alignment(pose: str, landmarks: list | None = None) -> dict:
    """Deterministic placeholder for the real MediaPipe pose-specific
    alignment validation (FITNESS-24). Works off the landmarks persisted by
    the detect stage - they're never recomputed here (ADR-013)."""
    return {
        "pose": pose,
        "aligned": True,
        "checks": [
            {"name": "subject_in_frame", "passed": True},
            {"name": "facing_expected_direction", "passed": True},
        ],
        "landmark_count": len(landmarks) if landmarks else 0,
        "stub": True,
    }
