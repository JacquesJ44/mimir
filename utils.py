from datetime import date
import calendar
from datetime import datetime
from dateutil.relativedelta import relativedelta
from zoneinfo import ZoneInfo

from pprint import pprint

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
    
# ---------- Anchor constructors ----------
    def _accrual_anchor(self, year: int, month: int) -> datetime:
        # 1st at 02:00 of given month
        return datetime(year, month, 1, 2, 0, tzinfo=self.TZ)

    def _payout_anchor(self, year: int, month: int) -> datetime:
        # 20th at 02:00 of given month
        return datetime(year, month, 20, 2, 0, tzinfo=self.TZ)
    
# ---------- Current "window" boundaries for the month of `now` ----------
    def this_month_accrual(self, now: datetime) -> datetime:
        return self._accrual_anchor(now.year, now.month)

    def this_month_payout(self, now: datetime) -> datetime:
        return self._payout_anchor(now.year, now.month)
    
    
# ---------- Public API ----------
    def current_payout_date(self) -> datetime:
        """
        The most recent payout date relative to 'now':
        - If now < this month's payout (20th @ 02:00), then last month's payout.
        - Else, this month's payout.
        """
        now = self.now()
        this_payout = self.this_month_payout(now)
        if now < this_payout:
            return this_payout - relativedelta(months=1)
        else:
            return this_payout

    def next_payout_date(self) -> datetime:
        """The next upcoming payout date (20th @ 02:00) after 'now'."""
        return self.current_payout_date() + relativedelta(months=1)

    def next_accrual_date(self) -> datetime:
        """
        The next upcoming accrual date (1st @ 02:00) after 'now':
        - If now < this month's accrual (1st @ 02:00), return this month's.
        - Else, next month's accrual.
        """
        now = self.now()
        this_accrual = self.this_month_accrual(now)
        if now < this_accrual:
            return this_accrual
        else:
            return this_accrual + relativedelta(months=1)
        
    
    def commission_status(self):
        now = self.now()

        # anchors for this month
        accrual_this = self._accrual_anchor(now.year, now.month)
        payout_this = self._payout_anchor(now.year, now.month)

        # previous month anchors
        accrual_prev = accrual_this - relativedelta(months=1)
        payout_prev = payout_this - relativedelta(months=1)

        # next month anchors
        accrual_next = accrual_this + relativedelta(months=1)
        payout_next = payout_this + relativedelta(months=1)

        # Determine most recent accrual
        if now >= accrual_this:
            last_accrual = accrual_this
            next_accrual = accrual_next
        else:
            last_accrual = accrual_prev
            next_accrual = accrual_this

        # Determine most recent payout
        if now >= payout_this:
            last_payout = payout_this
            next_payout = payout_next
        else:
            last_payout = payout_prev
            next_payout = payout_this

        # Phase depends on which event happened last
        if last_accrual > last_payout:
            status = "COUNTDOWN"
            current_accrual = last_accrual
            current_payout = next_payout
        else:
            status = "WAITING_FOR_ACCRUAL"
            current_accrual = next_accrual
            current_payout = last_payout

        return {
            "status": status,
            "now": now,
            "current_payout": current_payout,
            "current_accrual": current_accrual,
            "next_payout": next_payout,
            "next_accrual": next_accrual
        }







    # def current_payout_date(self):
    #     """Return the most recent payout date (20th @ 02:00)."""
    #     now = self.now()
    #     this_month = datetime(now.year, now.month, 20, 2, 0, tzinfo=self.TZ)
    #     if now < this_month:
    #         # Haven't reached this month's payout yet → use last month's
    #         return this_month - relativedelta(months=1)
    #     else:
    #         # Already passed this month's payout → use this one
    #         return this_month

    # def next_payout_date(self):
    #     """Return the next upcoming payout date (20th @ 02:00)."""
    #     return self.current_payout_date() + relativedelta(months=1)

    # def next_accrual_date(self):
    #     """Return the next upcoming accrual date (1st @ 02:00)."""
    #     now = self.now()
    #     this_month = datetime(now.year, now.month, 1, 2, 0, tzinfo=self.TZ)
    #     if now < this_month:
    #         return this_month
    #     else:
    #         return this_month + relativedelta(months=1)

    # def commission_status(self):
    #     now = self.now()
    #     payout = self.current_payout_date()
    #     accrual = self.next_accrual_date()
    #     next_payout = self.next_payout_date()
    #     next_accrual = accrual + relativedelta(months=1)

    #     if now < payout:
    #         status = "COUNTDOWN"
    #         current_payout = payout
    #         current_accrual = accrual

    #     elif payout <= now < next_accrual:
    #         status = "WAITING_FOR_ACCRUAL"
    #         current_payout = payout
    #         current_accrual = accrual

    #     else:
    #         # After accrual → roll forward
    #         status = "COUNTDOWN"
    #         current_payout = next_payout
    #         current_accrual = next_accrual
    #         next_payout = current_payout + relativedelta(months=1)
    #         next_accrual = current_accrual + relativedelta(months=1)

    #     # print("DEBUG:")
    #     # for key, value in {
    #     #     "now": now,
    #     #     "payout": payout,
    #     #     "accrual": accrual,
    #     #     "next_payout": next_payout,
    #     #     "next_accrual": next_accrual
    #     # }.items():
    #     #     print(f"  {key}: {value}")

    #     return {
    #         "status": status,
    #         "now": now,
    #         "current_payout": current_payout,
    #         "current_accrual": current_accrual,
    #         "next_payout": next_payout,
    #         "next_accrual": next_accrual
    #     }



        





