import logging
import threading

from fastapi import FastAPI

from .queue_consumer import consume_forever

logging.basicConfig(level=logging.INFO)

app = FastAPI()


@app.on_event("startup")
def start_consumer() -> None:
    threading.Thread(target=consume_forever, daemon=True).start()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
