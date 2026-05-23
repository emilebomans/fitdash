"""
Strava sync logic: fetch activities + streams, compute metrics, upsert to Supabase.
Handles rate limits (100 req/15 min) with automatic sleep.
"""
from __future__ import annotations
import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from supabase import Client

from metrics import calculate_tss, compute_fitness_metrics, compute_power_curve

logger = logging.getLogger(__name__)

STRAVA_API = "https://www.strava.com/api/v3"
RATE_LIMIT_REQUESTS = 90          # conservative (limit is 100/15min)
RATE_LIMIT_SLEEP = 15 * 60 + 5   # 15 min + 5s buffer
STREAMS_MIN_DURATION = 20 * 60   # only fetch streams for activities > 20 min


async def refresh_strava_token(
    user_id: str,
    token_row: dict[str, Any],
    client_id: str,
    client_secret: str,
    supabase: Client,
) -> str:
    """Refresh Strava access token if expiring within 5 minutes."""
    now = int(time.time())
    if token_row['expires_at'] > now + 300:
        return token_row['access_token']

    logger.info(f"Refreshing Strava token for user {user_id}")
    async with httpx.AsyncClient() as http:
        res = await http.post(
            "https://www.strava.com/oauth/token",
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "refresh_token",
                "refresh_token": token_row['refresh_token'],
            },
        )
        res.raise_for_status()
        data = res.json()

    supabase.table('strava_tokens').update({
        'access_token': data['access_token'],
        'refresh_token': data['refresh_token'],
        'expires_at': data['expires_at'],
    }).eq('user_id', user_id).execute()

    return data['access_token']


async def fetch_activities_page(
    access_token: str,
    page: int,
    per_page: int = 200,
    after: int | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {'page': page, 'per_page': per_page}
    if after:
        params['after'] = after
    async with httpx.AsyncClient(timeout=30) as http:
        res = await http.get(
            f"{STRAVA_API}/athlete/activities",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )
        res.raise_for_status()
        return res.json()


async def fetch_streams(
    access_token: str,
    activity_id: int,
) -> dict[str, Any]:
    keys = "time,watts,heartrate,cadence,velocity_smooth,altitude"
    async with httpx.AsyncClient(timeout=30) as http:
        res = await http.get(
            f"{STRAVA_API}/activities/{activity_id}/streams",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"keys": keys, "key_by_type": "true"},
        )
        if res.status_code == 404:
            return {}
        res.raise_for_status()
        return res.json()


def parse_stream(raw: dict[str, Any], key: str) -> list:
    return raw.get(key, {}).get('data', []) or []


async def sync_user(
    user_id: str,
    supabase: Client,
    client_id: str,
    client_secret: str,
    full_sync: bool = False,
) -> dict[str, Any]:
    """
    Full or incremental sync for a single user.
    Returns summary dict.
    """
    # Fetch token row
    token_res = supabase.table('strava_tokens').select('*').eq('user_id', user_id).single().execute()
    if not token_res.data:
        raise ValueError(f"No Strava token for user {user_id}")

    token_row = token_res.data

    # Mark as syncing
    supabase.table('strava_tokens').update({
        'sync_status': 'syncing',
        'sync_error': None,
    }).eq('user_id', user_id).execute()

    try:
        # Refresh token if needed
        access_token = await refresh_strava_token(user_id, token_row, client_id, client_secret, supabase)

        # Fetch profile for FTP / LTHR
        profile_res = supabase.table('profiles').select('ftp, max_hr, lthr').eq('id', user_id).single().execute()
        profile = profile_res.data or {}
        ftp = profile.get('ftp') or 200
        lthr = profile.get('lthr') or 170
        max_hr = profile.get('max_hr') or 190

        # Determine after timestamp for incremental sync
        after_ts = None
        if not full_sync and token_row.get('last_synced_at'):
            after_ts = int(datetime.fromisoformat(
                token_row['last_synced_at'].replace('Z', '+00:00')
            ).timestamp()) - 3600  # 1hr overlap to avoid gaps

        # Fetch all activities (paginated, rate-limited)
        all_activities: list[dict[str, Any]] = []
        page = 1
        request_count = 0

        while True:
            if request_count >= RATE_LIMIT_REQUESTS:
                logger.warning(f"Rate limit approaching, sleeping {RATE_LIMIT_SLEEP}s")
                await asyncio.sleep(RATE_LIMIT_SLEEP)
                request_count = 0

            activities = await fetch_activities_page(access_token, page, after=after_ts)
            request_count += 1

            if not activities:
                break

            all_activities.extend(activities)
            logger.info(f"User {user_id}: fetched page {page}, {len(activities)} activities")

            if len(activities) < 200:
                break
            page += 1

        logger.info(f"User {user_id}: total {len(all_activities)} activities to process")

        # Upsert activities
        new_activity_ids: list[int] = []
        for act in all_activities:
            tss = calculate_tss(act, ftp, lthr)
            intensity_factor = 0.0
            np_watts = act.get('weighted_avg_watts') or 0
            if np_watts and ftp:
                intensity_factor = round(np_watts / ftp, 3)

            row = {
                'user_id': user_id,
                'strava_id': act['id'],
                'name': act.get('name'),
                'sport_type': act.get('sport_type') or act.get('type'),
                'start_date': act.get('start_date'),
                'elapsed_time': act.get('elapsed_time'),
                'moving_time': act.get('moving_time'),
                'distance': act.get('distance'),
                'elevation_gain': act.get('total_elevation_gain'),
                'average_heartrate': act.get('average_heartrate'),
                'max_heartrate': int(act['max_heartrate']) if act.get('max_heartrate') is not None else None,
                'average_watts': act.get('average_watts'),
                'weighted_avg_watts': np_watts or None,
                'max_watts': int(act['max_watts']) if act.get('max_watts') is not None else None,
                'average_speed': act.get('average_speed'),
                'max_speed': act.get('max_speed'),
                'calories': int(act['calories']) if act.get('calories') is not None else None,
                'suffer_score': int(act['suffer_score']) if act.get('suffer_score') is not None else None,
                'tss': tss,
                'intensity_factor': intensity_factor,
                'kudos_count': int(act['kudos_count']) if act.get('kudos_count') is not None else None,
                'description': act.get('description'),
                'trainer': act.get('trainer', False),
                'commute': act.get('commute', False),
            }

            upsert_res = supabase.table('activities').upsert(row, on_conflict='strava_id').execute()
            if upsert_res.data:
                new_activity_ids.append(act['id'])

        # Fetch streams for longer new activities
        stream_candidates = [
            a for a in all_activities
            if (a.get('moving_time') or 0) >= STREAMS_MIN_DURATION
        ]
        logger.info(f"User {user_id}: fetching streams for {len(stream_candidates)} activities")

        for i, act in enumerate(stream_candidates):
            if request_count >= RATE_LIMIT_REQUESTS:
                logger.warning("Rate limit approaching, sleeping")
                await asyncio.sleep(RATE_LIMIT_SLEEP)
                request_count = 0

            # Get DB activity id first
            act_row = supabase.table('activities')\
                .select('id')\
                .eq('strava_id', act['id'])\
                .limit(1).execute()
            if not act_row.data:
                continue
            db_activity_id = act_row.data[0]['id']

            # Check if streams already exist (using correct DB id)
            existing = supabase.table('activity_streams')\
                .select('id')\
                .eq('activity_id', db_activity_id)\
                .limit(1).execute()
            if existing.data:
                continue

            try:
                raw = await fetch_streams(access_token, act['id'])
                request_count += 1

                if raw:
                    supabase.table('activity_streams').upsert({
                        'activity_id': db_activity_id,
                        'user_id': user_id,
                        'time_arr': parse_stream(raw, 'time'),
                        'watts_arr': parse_stream(raw, 'watts'),
                        'heartrate_arr': parse_stream(raw, 'heartrate'),
                        'cadence_arr': parse_stream(raw, 'cadence'),
                        'speed_arr': parse_stream(raw, 'velocity_smooth'),
                        'altitude_arr': parse_stream(raw, 'altitude'),
                    }, on_conflict='activity_id').execute()
            except Exception as e:
                logger.warning(f"Failed to fetch streams for activity {act['id']}: {e}")

        # Recompute CTL/ATL/TSB
        all_acts_res = supabase.table('activities')\
            .select('start_date, tss')\
            .eq('user_id', user_id)\
            .order('start_date')\
            .execute()

        tss_series = [
            {'date': a['start_date'][:10], 'tss': a['tss'] or 0}
            for a in (all_acts_res.data or [])
        ]

        daily_metrics = compute_fitness_metrics(tss_series)

        if daily_metrics:
            rows = [{'user_id': user_id, **m} for m in daily_metrics]
            # Upsert in chunks of 500
            for i in range(0, len(rows), 500):
                supabase.table('daily_metrics').upsert(
                    rows[i:i + 500],
                    on_conflict='user_id,date'
                ).execute()

        # Update sync status
        total = supabase.table('activities').select('id', count='exact').eq('user_id', user_id).execute()
        supabase.table('strava_tokens').update({
            'sync_status': 'idle',
            'last_synced_at': datetime.now(timezone.utc).isoformat(),
            'total_activities': total.count or 0,
        }).eq('user_id', user_id).execute()

        logger.info(f"User {user_id}: sync complete")
        return {'status': 'ok', 'activities_processed': len(all_activities)}

    except Exception as e:
        logger.error(f"Sync failed for user {user_id}: {e}", exc_info=True)
        supabase.table('strava_tokens').update({
            'sync_status': 'error',
            'sync_error': str(e),
        }).eq('user_id', user_id).execute()
        raise
