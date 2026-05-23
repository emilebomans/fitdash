"""
Sports science calculations: TSS, NP, CTL/ATL/TSB, power curve, HR zones.
"""
from __future__ import annotations
import numpy as np
from datetime import date, timedelta
from typing import Any


def normalized_power(watts_arr: list[int]) -> float:
    """Compute Normalized Power from a per-second watts array."""
    if not watts_arr or len(watts_arr) < 30:
        return 0.0
    arr = np.array(watts_arr, dtype=float)
    # 30-second rolling average
    kernel = np.ones(30) / 30
    rolling = np.convolve(arr, kernel, mode='valid')
    # 4th power mean, 4th root
    return float(np.mean(rolling ** 4) ** 0.25)


def calculate_tss(activity: dict[str, Any], ftp: int, lthr: int) -> float:
    """
    Calculate TSS for an activity.
    Priority: power TSS > hrTSS > suffer_score fallback
    """
    duration_s = activity.get('moving_time') or activity.get('elapsed_time') or 0
    if duration_s == 0:
        return 0.0

    # Power-based TSS (cycling with NP)
    np_watts = activity.get('weighted_avg_watts') or 0
    if np_watts and ftp:
        intensity_factor = np_watts / ftp
        tss = (duration_s * np_watts * intensity_factor) / (ftp * 3600) * 100
        return round(tss, 1)

    # HR-based TSS
    avg_hr = activity.get('average_heartrate') or 0
    if avg_hr and lthr:
        hr_ratio = avg_hr / lthr
        hr_tss = (duration_s * avg_hr * hr_ratio) / (lthr * 3600) * 100
        return round(hr_tss, 1)

    # Strava suffer score fallback
    suffer = activity.get('suffer_score') or 0
    return float(suffer)


def compute_fitness_metrics(
    activities_with_tss: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Compute CTL, ATL, TSB for every day from first activity to today.

    CTL_d = CTL_{d-1} + (TSS_d - CTL_{d-1}) / 42
    ATL_d = ATL_{d-1} + (TSS_d - ATL_{d-1}) / 7
    TSB_d = CTL_{d-1} - ATL_{d-1}   (prior-day values, TrainingPeaks convention)
    """
    if not activities_with_tss:
        return []

    # Build daily TSS map
    tss_by_date: dict[date, float] = {}
    for act in activities_with_tss:
        d = act['date']
        if isinstance(d, str):
            d = date.fromisoformat(d[:10])
        tss_by_date[d] = tss_by_date.get(d, 0.0) + (act.get('tss') or 0.0)

    start = min(tss_by_date.keys())
    end = date.today()

    results = []
    ctl = 0.0
    atl = 0.0

    current = start
    while current <= end:
        tss_day = tss_by_date.get(current, 0.0)
        tsb = ctl - atl  # prior day
        ctl = ctl + (tss_day - ctl) / 42
        atl = atl + (tss_day - atl) / 7
        results.append({
            'date': current.isoformat(),
            'ctl': round(ctl, 2),
            'atl': round(atl, 2),
            'tsb': round(tsb, 2),
            'tss_day': round(tss_day, 1),
        })
        current += timedelta(days=1)

    return results


def compute_power_curve(
    streams: list[dict[str, Any]],
    durations: list[int] | None = None,
) -> dict[int, float]:
    """
    Compute best mean maximal power for standard durations (seconds).
    Returns {duration_s: best_watts}.
    """
    if durations is None:
        durations = [5, 10, 30, 60, 120, 300, 600, 1200, 3600]

    bests: dict[int, float] = {d: 0.0 for d in durations}

    for stream in streams:
        watts = stream.get('watts_arr') or []
        if not watts:
            continue
        arr = np.array(watts, dtype=float)
        for dur in durations:
            if len(arr) < dur:
                continue
            kernel = np.ones(dur) / dur
            rolling = np.convolve(arr, kernel, mode='valid')
            peak = float(rolling.max())
            if peak > bests[dur]:
                bests[dur] = peak

    return {d: round(v, 1) for d, v in bests.items()}


def hr_zone_distribution(
    streams: list[dict[str, Any]],
    max_hr: int,
) -> dict[str, float]:
    """
    Seconds spent in each HR zone across all streams.
    Zones based on % of max HR: Z1<60, Z2 60-70, Z3 70-80, Z4 80-90, Z5>90.
    """
    zones = {'z1': 0.0, 'z2': 0.0, 'z3': 0.0, 'z4': 0.0, 'z5': 0.0}
    thresholds = [0.60, 0.70, 0.80, 0.90]

    for stream in streams:
        hr = stream.get('heartrate_arr') or []
        t = stream.get('time_arr') or []
        if not hr or not t:
            continue
        for i, bpm in enumerate(hr):
            dt = (t[i] - t[i - 1]) if i > 0 else 1
            pct = bpm / max_hr
            if pct < thresholds[0]:
                zones['z1'] += dt
            elif pct < thresholds[1]:
                zones['z2'] += dt
            elif pct < thresholds[2]:
                zones['z3'] += dt
            elif pct < thresholds[3]:
                zones['z4'] += dt
            else:
                zones['z5'] += dt

    return {k: round(v, 1) for k, v in zones.items()}
