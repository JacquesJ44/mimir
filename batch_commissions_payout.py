# This script prepares monthly commission payout summaries for Finance.
# Runs on the 20th of each month via cron.
# Does NOT modify ledger entries.

from datetime import date
import os
import sys
import logging
import calendar
from uuid import uuid4
from dotenv import load_dotenv

from db import DbUtil

load_dotenv()

db = DbUtil({
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'db': os.getenv('DB_NAME')
})

LOG_FILE = 'batch_commission_payout.log'
logging.basicConfig(filename=LOG_FILE, level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')


def get_target_year_month():
    if len(sys.argv) == 3:
        year = int(sys.argv[1])
        month = int(sys.argv[2])
        if month < 1 or month > 12:
            raise ValueError("Month must be between 1 and 12")
        return year, month

    today = date.today()
    year = today.year
    month = today.month - 1
    if month == 0:
        month = 12
        year -= 1

    return year, month


def kill_switch_enabled():
    """
    Global kill switch for automated commission processes.
    """
    try:
        return db.get_system_setting_bool("commission_auto_pay")
    except Exception as e:
        logging.error(f"Kill switch lookup failed: {e}")
        # Fail CLOSED (safe)
        return False


def run_monthly_commission_auto_payout(year: int, month: int):
    logging.info(f"Auto payout for {year}-{month:02d}")

    if not kill_switch_enabled():
        logging.warning("AUTO PAYOUT DISABLED")
        return

    earned_entries = db.get_unpaid_earned_commissions(year, month)

    if not earned_entries:
        logging.info("No unpaid earned commissions.")
        return

    paid = 0
    failed = []
    payout_batch_id = f"AUTO-{year}-{month:02d}-{uuid4().hex[:6]}"

    for row in earned_entries:
        success = db.create_commission_payment_entry_batch(
            earned_ledger_id=row["id"],
            payment_date=date.today(), 
            payout_batch_id=payout_batch_id,
            notes="Auto payout batch"
        )
        if success:
            paid += 1
        else:
            failed.append(row["id"])

    logging.info(f"Paid {paid}, Failed {failed}")


    # TO DO 
    # db.send_commission_payout_email(summary, year, month)


if __name__ == "__main__":
    year, month = get_target_year_month()
    run_monthly_commission_auto_payout(year, month)
