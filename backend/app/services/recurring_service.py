from collections import defaultdict
import datetime
from sqlalchemy.orm import Session
from backend.app.models import db_models

def detect_recurring_expenses(user_id: int, db: Session) -> list:
    """
    Scans expense transactions and identifies recurring bills (e.g. rent, utilities, subscriptions).
    Criteria:
    - Same description (case-insensitive, trimmed)
    - At least 2 transactions
    - Spacing between successive dates is roughly 25 to 35 days (Monthly) or 5 to 9 days (Weekly)
    - Amount is relatively stable (individual amounts are within 20% of their overall average)
    """
    expenses = db.query(db_models.Transaction).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense"
    ).order_by(db_models.Transaction.date.asc()).all()

    # Group by description
    grouped = defaultdict(list)
    for tx in expenses:
        desc_key = tx.description.strip().lower()
        if len(desc_key) >= 3:
            grouped[desc_key].append(tx)

    recurring_list = []
    for desc, tx_list in grouped.items():
        if len(tx_list) < 2:
            continue

        intervals = []
        amounts = [t.amount for t in tx_list]
        avg_amount = sum(amounts) / len(amounts)

        # Calculate time intervals between consecutive expenses
        for i in range(len(tx_list) - 1):
            d1 = tx_list[i].date
            d2 = tx_list[i+1].date
            diff = (d2 - d1).days
            intervals.append(diff)

        # Calculate average interval in days
        avg_interval = sum(intervals) / len(intervals)
        
        is_monthly = 25 <= avg_interval <= 35
        is_weekly = 5 <= avg_interval <= 9

        # Ensure amounts are stable (all amounts within 20% of the average amount)
        amounts_stable = all(abs(a - avg_amount) / avg_amount <= 0.2 for a in amounts)

        if (is_monthly or is_weekly) and amounts_stable:
            recurring_list.append({
                "description": tx_list[0].description,
                "category": tx_list[0].category,
                "frequency": "Monthly" if is_monthly else "Weekly",
                "average_amount": float(round(avg_amount, 2)),
                "last_date": tx_list[-1].date.strftime("%Y-%m-%d"),
                "occurrences": len(tx_list)
            })

    return recurring_list
