# This script resets expired pending commissions in the database. It should be run periodically to ensure that expired applicatons (which should be in a 'pending' state) are reset.
# Sales agents can then reapply for commissions on these applications.
# This should be run every 24 hours via a cronjob.

from app import db
from datetime import date
import logging

logger = logging.getLogger(__name__)

db.reset_expired_pending_commissions()
logger.info("All expired pending commissions have been reset (%s)", date.today().strftime("%Y-%m-%d"))