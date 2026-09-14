import logging
import threading

from fastapi import FastAPI, HTTPException

from . import queue_consumer

logging.basicConfig(level=logging.INFO)

app = FastAPI()

_consumer_thread: threading.Thread | None = None


@app.on_event("startup")
def start_consumer() -> None:
    global _consumer_thread
    _consumer_thread = threading.Thread(
        target=queue_consumer.consume_forever, daemon=True
    )
    _consumer_thread.start()


@app.get("/health")
def health() -> dict:
    if _consumer_thread is None or not _consumer_thread.is_alive():
        raise HTTPException(status_code=503, detail="queue consumer is not running")
    # A wedged thread stays alive, so liveness alone cannot spot a stalled loop.
    if not queue_consumer.is_consuming():
        raise HTTPException(status_code=503, detail="queue consumer is stalled")
    return {"status": "ok"}
