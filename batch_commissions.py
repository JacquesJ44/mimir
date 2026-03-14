
# This script processes monthly commission accruals for active commissions. It should run once a month via cronjob.

# This should run on the first day of each month to calculate commission earned by salespeople for the previous month. Once the amount is calculated, a ledger entry is created for each commission, with entry type 'earned"

# If run without arguments, it defaults to processing the previous month. You can also provide year and month as arguments.
# Example usage:
#   python batch_commissions.py 2024 5

from datetime import date
import os
import pymysql
import calendar
import sys
import logging

from dotenv import load_dotenv
load_dotenv()

from db import DbUtil

from pprint import pprint


db = DbUtil({
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'db': os.getenv('DB_NAME')
})

LOG_FILE = 'batch_commissions.log'
logging.basicConfig(filename=LOG_FILE, level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')

def get_target_year_month():
    """
    Returns:
      year, month
    - If arguments are provided: uses those
    - Otherwise defaults to previous month
    """
    if len(sys.argv) == 3:
        year = int(sys.argv[1])
        month = int(sys.argv[2])

        if month < 1 or month > 12:
            raise ValueError("Month must be between 1 and 12")

        return year, month

    # Default: previous month
    today = date.today()
    year = today.year
    month = today.month - 1
    if month == 0:
        month = 12
        year -= 1

    return year, month


def run_monthly_commission_accrual(year: int, month: int):
    conn = db.get_connection()

    with conn.cursor(pymysql.cursors.DictCursor) as c:

        c.execute("""
            SELECT id, end_date
            FROM commissions
            WHERE status = 'active'
              AND payout_hold = 0
              AND start_date <= %s
              AND (end_date IS NULL OR end_date >= %s)
        """, (
            date(year, month, calendar.monthrange(year, month)[1]),
            date(year, month, 1)
        ))

        commission_rows = c.fetchall()

        logging.info(
            f"Processing {len(commission_rows)} commissions for {year}-{month:02d}"
        )

    conn.close()

    for row in commission_rows:
        commission_id = row["id"]
        end_date = row["end_date"]

        created = db.create_monthly_commission_ledger_entry(
            commission_id,
            year,
            month
        )

        # If this was the final accrual month
        # Only fetch the ledger ID if this is the final accrual month
        if end_date and end_date.year == year and end_date.month == month:
            conn = db.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:
                # Get the ledger row for this commission and month
                c.execute("""
                    SELECT id
                    FROM commission_ledger
                    WHERE commission_id = %s
                    AND entry_type = 'earned'
                    AND period_start = %s
                    AND period_end = %s
                    ORDER BY id DESC
                    LIMIT 1
                """, (
                    commission_id,
                    date(year, month, 1),
                    date(year, month, calendar.monthrange(year, month)[1])
                ))
                ledger_row = c.fetchone()
                if ledger_row:
                    ledger_id = ledger_row["id"]

                    # Mark last_earned
                    c.execute("""
                        UPDATE commission_ledger
                        SET last_earned = 1
                        WHERE id = %s
                    """, (ledger_id,))

                    # Complete the commission
                    c.execute("""
                        UPDATE commissions
                        SET status = 'completed',
                            payout_hold = 1
                        WHERE id = %s
                    """, (commission_id,))
            conn.commit()
            conn.close()

            logging.info(f"Commission {commission_id} completed; last earned ledger marked {ledger_id}")

if __name__ == "__main__":
    year, month = get_target_year_month()
    run_monthly_commission_accrual(year, month)
