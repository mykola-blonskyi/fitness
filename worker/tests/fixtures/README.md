# Test fixtures

`front.jpg` — the canonical MediaPipe Pose Landmarker sample image
(`girl-4051811` from Pixabay, https://pixabay.com/photos/girl-model-portrait-4051811/),
resized to 480px. Pixabay Content License (free to use, no attribution
required). Used only by `test_pose_landmarker_smoke.py` to exercise the
real model end to end.

Representative front/side/back progress photos and heuristic calibration
against them are a follow-up (see the PR) — the classification logic is
covered by synthetic-landmark tests in `test_pose_geometry.py`.
