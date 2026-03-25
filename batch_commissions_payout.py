# This script prepares monthly commission payout summaries for Finance.
# Runs on the 20th of each month via cron.
# Does NOT modify ledger entries.

from datetime import date
import os
import pprint
import sys
import logging
from dotenv import load_dotenv
from collections import defaultdict
from flask_mail import Message
from decimal import Decimal
from uuid import uuid4
import csv
import io

from pprint import pprint

from app import mail, app

from db import DbUtil

load_dotenv()

db = DbUtil({
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'db': os.getenv('DB_NAME')
})

LOG_FILE = 'batch_commissions_payout.log'
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
    paid_entries = []  # stores the rows that were successfully marked for payout, for email summary

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
            paid_entries.append(row)   # ← keep the entry
        else:
            failed.append(row["id"])

    logging.info(f"Paid {paid}, Failed {failed}")

    if paid_entries:
        # pprint(paid_entries)
        send_commission_payout_email(paid_entries, year, month, payout_batch_id)

def send_commission_payout_email(summary, year, month, payout_batch_id):

    recipients=[email.strip() for email in os.getenv("FINANCE_EMAIL").split(",")]
    salespeople = defaultdict(list)

    for row in summary:
        key = (row["user_id"], f"{row.get('user_name','')} {row.get('user_surname','')}")
        salespeople[key].append(row)

    # ---------- SUMMARY CALCULATION ----------
    summary_rows = []
    grand_total = Decimal("0.00")

    for (_, name), entries in salespeople.items():
        subtotal = sum(Decimal(e["commission_value"]) for e in entries)
        summary_rows.append((name, subtotal))
        grand_total += subtotal

    # ---------- EMAIL HTML ----------
    html = f"""
    <html>
    <body>
    <p>Dear Finance Team,</p>

    <p>Please process the following commission payouts for <b>{year}-{month:02d}</b>.</p>

    <h2>Payment Summary</h2>
    <table style="border-collapse:collapse;">
        <thead>
            <tr style="background:#f2f2f2;">
                <th style="border:1px solid #ddd;padding:8px;">Salesperson</th>
                <th style="border:1px solid #ddd;padding:8px;">Amount</th>
            </tr>
        </thead>
        <tbody>
    """

    for name, subtotal in summary_rows:
        html += f"""
        <tr>
            <td style="border:1px solid #ddd;padding:8px;">{name}</td>
            <td style="border:1px solid #ddd;padding:8px;">R{subtotal:.2f}</td>
        </tr>
        """

    html += f"""
        <tr style="font-weight:bold;background:#fafafa;">
            <td style="border:1px solid #ddd;padding:8px;">Grand Total</td>
            <td style="border:1px solid #ddd;padding:8px;">R{grand_total:.2f}</td>
        </tr>
        </tbody>
    </table>

    <br>
    <p>Detailed breakdown:</p>
    """

    # ---------- DETAIL TABLES ----------
    for (_, user_name), entries in salespeople.items():

        html += f"<h3>{user_name}</h3>"

        html += """
        <table style="border-collapse:collapse;width:100%;">
        <thead>
            <tr style="background:#f2f2f2;">
                <th style="border:1px solid #ddd;padding:8px;">Circuit</th>
                <th style="border:1px solid #ddd;padding:8px;">Client</th>
                <th style="border:1px solid #ddd;padding:8px;">Active Days</th>
                <th style="border:1px solid #ddd;padding:8px;">Commission</th>
            </tr>
        </thead>
        <tbody>
        """

        subtotal = Decimal("0.00")

        for e in entries:
            value = Decimal(e["commission_value"])
            subtotal += value

            html += f"""
            <tr>
                <td style="border:1px solid #ddd;padding:8px;">{e.get('circuit_number','-')}</td>
                <td style="border:1px solid #ddd;padding:8px;">{e.get('client_name','-')}</td>
                <td style="border:1px solid #ddd;padding:8px;">{e.get('active_days','-')}</td>
                <td style="border:1px solid #ddd;padding:8px;">R{value:.2f}</td>
            </tr>
            """

        html += f"""
        <tr style="font-weight:bold;background:#fafafa;">
            <td colspan="3" style="border:1px solid #ddd;padding:8px;text-align:right;">
                Total
            </td>
            <td style="border:1px solid #ddd;padding:8px;">
                R{subtotal:.2f}
            </td>
        </tr>
        </tbody>
        </table>
        <br>
        """

    html += """
    <p>
    This payout batch was generated automatically by the Mimir system.
    </p>

    <p>Regards<br>Mimir</p>
    </body>
    </html>
    """

    # ---------- CREATE CSV ATTACHMENT ----------
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Salesperson",
        "Circuit",
        "Client",
        "Active Days",
        "Commission Value"
    ])

    for (_, name), entries in salespeople.items():
        for e in entries:
            writer.writerow([
                name,
                e.get("circuit_number"),
                e.get("client_name"),
                e.get("active_days"),
                float(e["commission_value"])
            ])

    csv_data = output.getvalue()

    # ---------- EMAIL ----------
    msg = Message(
        subject=f"Commission Payout Report - Batch ID: {payout_batch_id}",
        recipients=recipients,
        html=html
    )

    msg.attach(
        f"commission_payout_{payout_batch_id}.csv",
        "text/csv",
        csv_data
    )

    mail.send(msg)
    logging.info(f"Commission payout email sent to {recipients}")

if __name__ == "__main__":
    year, month = get_target_year_month()
    with app.app_context():
        run_monthly_commission_auto_payout(year, month)
    
