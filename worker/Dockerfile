# syntax=docker/dockerfile:1
# Coolify deployment (see docs/decisions.md ADR-005, docs/architecture.md).

FROM python:3.12-slim

WORKDIR /app

# MediaPipe/OpenCV need these shared libs at runtime; curl fetches the
# Pose Landmarker model at build time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 curl \
  && rm -rf /var/lib/apt/lists/*

COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bundle the model so the container never downloads it at runtime.
RUN mkdir -p /app/models \
  && curl -fsSL -o /app/models/pose_landmarker_full.task \
     https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task
ENV POSE_LANDMARKER_MODEL=/app/models/pose_landmarker_full.task

COPY worker/app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
