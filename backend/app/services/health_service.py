import datetime
from sqlalchemy.orm import Session
from backend.app.models import db_models

def calculate_health_score(user_id: int, db: Session) -> float:
    """
    Calculate Financial Health Score (0 - 100) based on:
    1. Savings Rate (40%)
    2. Budget Adherence (30%)
    3. Expense Anomaly Ratio (30%)
    """
    # 1. Savings Rate
    # Fetch current month's income and expenses
    today = datetime.date.today()
    current_year_month = today.strftime("%Y-%m")
    
    # Query all transactions for the current month
    transactions = db.query(db_models.Transaction).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.date >= datetime.date(today.year, today.month, 1),
        db_models.Transaction.date <= today
    ).all()
    
    income = sum(t.amount for t in transactions if t.type == "income")
    expenses = sum(t.amount for t in transactions if t.type == "expense")
    
    savings_rate_score = 0.0
    if income > 0:
        savings_rate = (income - expenses) / income
        # If savings rate is >= 30%, give full 40 points, else scale proportionally
        if savings_rate >= 0.3:
            savings_rate_score = 40.0
        elif savings_rate > 0:
            savings_rate_score = (savings_rate / 0.3) * 40.0
    else:
        # If no income is logged, check if there are no expenses either
        if expenses == 0:
            savings_rate_score = 20.0  # Default neutral score if no activity
            
    # 2. Budget Adherence
    # Fetch budgets configured for the current month
    budgets = db.query(db_models.Budget).filter(
        db_models.Budget.user_id == user_id,
        db_models.Budget.month == current_year_month
    ).all()
    
    budget_score = 30.0
    if budgets:
        # Calculate spending per category in current month
        cat_spending = {}
        for t in transactions:
            if t.type == "expense":
                cat_spending[t.category] = cat_spending.get(t.category, 0.0) + t.amount
                
        exceeded_count = 0
        for b in budgets:
            spent = cat_spending.get(b.category, 0.0)
            if spent > b.limit_amount:
                exceeded_count += 1
                
        # Deduct score based on ratio of budgets exceeded
        exceeded_ratio = exceeded_count / len(budgets)
        budget_score = 30.0 * (1.0 - exceeded_ratio)
    else:
        # If no budgets are set, give a default adherence score of 20 points
        budget_score = 20.0
        
    # 3. Behavioral / Anomaly Ratio
    # Check what proportion of expenses in the current month are anomalies
    expense_txs = [t for t in transactions if t.type == "expense"]
    anomaly_score_contrib = 30.0
    if expense_txs:
        anomalies_count = sum(1 for t in expense_txs if t.is_anomaly)
        anomaly_ratio = anomalies_count / len(expense_txs)
        # Deduct score proportionally for anomalies
        anomaly_score_contrib = 30.0 * (1.0 - anomaly_ratio)
        
    total_score = savings_rate_score + budget_score + anomaly_score_contrib
    return float(round(max(0.0, min(100.0, total_score)), 2))
