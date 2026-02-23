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

    def current_payout_date(self):
        """Return the most recent payout date (20th @ 02:00)."""
        now = self.now()
        this_month = datetime(now.year, now.month, 20, 2, 0, tzinfo=self.TZ)
        if now < this_month:
            # Haven't reached this month's payout yet → use last month's
            return this_month - relativedelta(months=1)
        else:
            # Already passed this month's payout → use this one
            return this_month

    def next_payout_date(self):
        """Return the next upcoming payout date (20th @ 02:00)."""
        return self.current_payout_date() + relativedelta(months=1)

    def next_accrual_date(self):
        """Return the next upcoming accrual date (1st @ 02:00)."""
        now = self.now()
        this_month = datetime(now.year, now.month, 1, 2, 0, tzinfo=self.TZ)
        if now < this_month:
            return this_month
        else:
            return this_month + relativedelta(months=1)

    def commission_status(self):
        now = self.now()
        payout = self.current_payout_date()
        accrual = self.next_accrual_date()
        next_payout = self.next_payout_date()
        next_accrual = accrual + relativedelta(months=1)

        if now < payout:
            status = "COUNTDOWN"
            current_payout = payout
            current_accrual = accrual

        elif payout <= now < accrual:
            status = "WAITING_FOR_ACCRUAL"
            current_payout = payout
            current_accrual = accrual

        else:
            # After accrual → roll forward
            status = "COUNTDOWN"
            current_payout = next_payout
            current_accrual = next_accrual
            next_payout = current_payout + relativedelta(months=1)
            next_accrual = current_accrual + relativedelta(months=1)

        # print("DEBUG:")
        # for key, value in {
        #     "now": now,
        #     "payout": payout,
        #     "accrual": accrual,
        #     "next_payout": next_payout,
        #     "next_accrual": next_accrual
        # }.items():
        #     print(f"  {key}: {value}")

        return {
            "status": status,
            "now": now,
            "current_payout": current_payout,
            "current_accrual": current_accrual,
            "next_payout": next_payout,
            "next_accrual": next_accrual
        }



        





