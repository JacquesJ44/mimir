from datetime import date
import calendar
from datetime import datetime
from dateutil.relativedelta import relativedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Africa/Johannesburg")

# This function is used to describe changes between two dictionaries - used for logging
def describe_changes_log(old: dict, new: dict, fields: list = None) -> str:
    """
    Describes changes between two dictionaries.
    If 'old' is empty, assumes a create.
    If both values exist and differ, shows the change.
    """
    changes = []
    keys = fields if fields else set(new.keys())

    for key in keys:
        old_val = old.get(key)
        new_val = new.get(key)

        if old_val is None and new_val is not None:
            changes.append(f"{key}: '{new_val}'")  # New field set
        elif old_val != new_val:
            changes.append(f"{key}: '{old_val}' to '{new_val}'")  # Field updated

    return "; ".join(changes) if changes else "no changes"

def month_bounds(year: int, month: int):
    """
    Returns:
      period_start (date), period_end (date), days_in_month (int)
    """
    period_start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    period_end = date(year, month, last_day)
    return period_start, period_end, last_day


def overlap_days(start1: date, end1: date, start2: date, end2: date) -> int:
    """
    Returns number of overlapping days between two date ranges.
    Both ranges are inclusive.
    """
    overlap_start = max(start1, start2)
    overlap_end = min(end1, end2)

    if overlap_start > overlap_end:
        return 0

    return (overlap_end - overlap_start).days + 1

class CycleManager:
    def __init__(self, tz):
        self.TZ = tz

    def now(self):
        return datetime.now(self.TZ)

    def payout_this_month(self):
        now = self.now()
        return datetime(now.year, now.month, 18, 18, 20, tzinfo=self.TZ)

    def accrual_this_month(self):
        now = self.now()
        return datetime(now.year, now.month, 18, 18, 13, tzinfo=self.TZ)

    def next_payout_date(self):
        now = self.now()
        d = self.payout_this_month()
        if now >= d:
            d = d + relativedelta(months=1)
        return d

    def next_accrual_date(self):
        now = self.now()
        d = self.accrual_this_month()
        if now >= d:
            d = d + relativedelta(months=1)
        return d

    def commission_status(self):
        now = self.now()
        payout = self.payout_this_month()
        accrual = self.accrual_this_month()

        if now < payout:
            status = "COUNTDOWN"
            return {
                "status": status,
                "now": now,
                "payout": payout,
                "accrual": accrual
            }

        elif payout <= now < accrual:
            status = "WAITING_FOR_ACCRUAL"
            return {
                "status": status,
                "now": now,
                "payout": payout,
                "accrual": accrual
            }

        else:
            # accrual has passed → roll forward
            next_payout = payout + relativedelta(months=1)
            next_accrual = accrual + relativedelta(months=1)
            status = "COUNTDOWN"
            return {
                "status": status,
                "now": now,
                "payout": next_payout,
                "accrual": next_accrual
            }



