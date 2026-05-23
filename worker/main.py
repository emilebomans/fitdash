"""
FitDash Worker — FastAPI app.
Endpoints:
  GET  /                        health check
  POST /sync/{user_id}          trigger full or incremental sync
  GET  /sync/status/{user_id}   get sync status for a user
"""
from __future__ import annotations
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client

from sync import sync_user
from scheduler import start_scheduler

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')
logger = logging.getLogger(__name__)

WORKER_SECRET = os.environ.get('WORKER_SECRET', '')


def get_supabase() -> Client:
    return create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_ROLE_KEY'],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(title="FitDash Worker", lifespan=lifespan)


class SyncRequest(BaseModel):
    full_sync: bool = False


def verify_secret(authorization: str | None):
    if not WORKER_SECRET:
        return  # no secret set — dev mode, allow all
    if authorization != f"Bearer {WORKER_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/")
async def health():
    return {"status": "ok", "service": "fitdash-worker"}


@app.post("/sync/{user_id}")
async def trigger_sync(
    user_id: str,
    body: SyncRequest = SyncRequest(),
    authorization: str | None = Header(default=None),
):
    verify_secret(authorization)

    supabase = get_supabase()

    # Check if already syncing
    token = supabase.table('strava_tokens')\
        .select('sync_status')\
        .eq('user_id', user_id)\
        .maybe_single().execute()

    if token.data and token.data.get('sync_status') == 'syncing':
        raise HTTPException(status_code=409, detail="Sync already in progress")

    # Run in background so we return immediately
    asyncio.create_task(
        sync_user(
            user_id=user_id,
            supabase=supabase,
            client_id=os.environ['STRAVA_CLIENT_ID'],
            client_secret=os.environ['STRAVA_CLIENT_SECRET'],
            full_sync=body.full_sync,
        )
    )

    return {"status": "started", "user_id": user_id, "full_sync": body.full_sync}


@app.get("/sync/status/{user_id}")
async def sync_status(
    user_id: str,
    authorization: str | None = Header(default=None),
):
    verify_secret(authorization)

    supabase = get_supabase()
    token = supabase.table('strava_tokens')\
        .select('last_synced_at, total_activities, sync_status, sync_error')\
        .eq('user_id', user_id)\
        .maybe_single().execute()

    if not token.data:
        raise HTTPException(status_code=404, detail="No Strava token found")

    return token.data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
