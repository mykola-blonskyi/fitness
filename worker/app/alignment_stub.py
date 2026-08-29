def build_stub_alignment(pose: str) -> dict:
    """Deterministic placeholder for the real MediaPipe pose-specific
    alignment validation (FITNESS-24). Landmarks are not recomputed here -
    detection already persisted them (ADR-013)."""
    return {
        "pose": pose,
        "aligned": True,
        "checks": [
            {"name": "subject_in_frame", "passed": True},
            {"name": "facing_expected_direction", "passed": True},
        ],
        "stub": True,
    }
