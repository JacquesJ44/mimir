from datetime import date
import calendar
from datetime import datetime
from dateutil.relativedelta import relativedelta
from zoneinfo import ZoneInfo
import pymysql
from decimal import Decimal

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

def parse_decimal(value):
    try:
        return Decimal(str(value))
    except:
        return Decimal('0')

def parse_date(value):
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return None

#========================================================================================================================================
##      CYCLE MANAGEMENT FOR COUNTDOWN TIMER AND PHASES                ==================================================================
#========================================================================================================================================
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

#========================================================================================================================================
##      ANALYTICS     ===================================================================================================================
#========================================================================================================================================

def get_commission_monthly_summary(conn):
    with conn.cursor(pymysql.cursors.DictCursor) as c:
        c.execute("""
            SELECT 
                DATE_FORMAT(period_end, '%Y-%m') AS month,
                SUM(CASE WHEN entry_type='earned' THEN commission_value ELSE 0 END) AS earned,
                SUM(CASE WHEN entry_type='payment' THEN commission_value ELSE 0 END) AS paid
            FROM commission_ledger
            GROUP BY month
            ORDER BY month
        """)
        return c.fetchall()
    
def get_commission_outstanding(conn):
    with conn.cursor(pymysql.cursors.DictCursor) as c:
        c.execute("""
            SELECT
                SUM(CASE WHEN entry_type='earned' THEN commission_value ELSE 0 END) -
                SUM(CASE WHEN entry_type='payment' THEN commission_value ELSE 0 END)
                AS outstanding
            FROM commission_ledger
        """)
        return c.fetchone()
    
def get_commission_pipeline(conn):
    with conn.cursor(pymysql.cursors.DictCursor) as c:
        c.execute("""
            SELECT
                status,
                SUM(commission_value) AS total
            FROM commission_ledger
            WHERE entry_type = 'earned'
            GROUP BY status
        """)
        return c.fetchall()
    
def get_salesperson_commission_totals(conn):
    with conn.cursor(pymysql.cursors.DictCursor) as c:
        c.execute("""
            SELECT
                u.name,
                SUM(l.commission_value) AS total_commission
            FROM commission_ledger l
            JOIN users u ON l.user_id = u.id
            WHERE l.entry_type = 'earned'
            GROUP BY l.user_id
            ORDER BY total_commission DESC
        """)
        return c.fetchall()
    
def get_commission_dashboard(conn):
    from utils import (
        get_commission_monthly_summary,
        get_commission_outstanding,
        get_commission_pipeline,
        get_salesperson_commission_totals
    )

    return {
        "monthly_summary": get_commission_monthly_summary(conn),
        "outstanding": get_commission_outstanding(conn),
        "pipeline": get_commission_pipeline(conn),
        "salespeople": get_salesperson_commission_totals(conn)
    }
    




    


        





