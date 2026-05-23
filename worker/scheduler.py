"""
APScheduler jobs: incremental sync every 30 min, token refresh every 4 hours.
"""
from __future__ import annotations
import asyncio
import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from supabase import create_client, Client

from sync import sync_user

logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    return create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_ROLE_KEY'],
    )


async def run_incremental_sync_all():
    """Incremental sync for all users with a connected Strava account."""
    supabase = get_supabase()
    tokens = supabase.table('strava_tokens')\
        .select('user_id, sync_status')\
        .execute()

    for row in (tokens.data or []):
        if row['sync_status'] == 'syncing':
            logger.info(f"Skipping user {row['user_id']} — already syncing")
            continue
        try:
            await sync_user(
                user_id=row['user_id'],
                supabase=supabase,
                client_id=os.environ['STRAVA_CLIENT_ID'],
                client_secret=os.environ['STRAVA_CLIENT_SECRET'],
                full_sync=False,
            )
        except Exception as e:
            logger.error(f"Scheduled sync failed for {row['user_id']}: {e}")


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    # Incremental sync every 30 minutes
    scheduler.add_job(
        run_incremental_sync_all,
        'interval',
        minutes=30,
        id='incremental_sync',
        max_instances=1,
    )

    scheduler.start()
    logger.info("Scheduler started")
    return scheduler
