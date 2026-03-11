
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
            SELECT id
            FROM commissions
            WHERE status = 'active'
              AND payout_hold = 0
              AND start_date <= %s
              AND (end_date IS NULL OR end_date >= %s)
        """, (
            date(year, month, calendar.monthrange(year, month)[1]),
            date(year, month, 1)
        ))

        commission_ids = [row['id'] for row in c.fetchall()]

        logging.info(f"Processing {len(commission_ids)} commissions for {year}-{month:02d}, Commission IDs: {commission_ids}")

    conn.close()

    for commission_id in commission_ids:
        db.create_monthly_commission_ledger_entry(
            commission_id,
            year,
            month
        )


if __name__ == "__main__":
    year, month = get_target_year_month()
    run_monthly_commission_accrual(year, month)
