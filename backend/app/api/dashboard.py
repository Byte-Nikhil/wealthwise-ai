import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.services.insight_service import calculate_spending_stats, generate_rule_based_insights
from backend.app.services.health_service import calculate_health_score
from backend.app.services.recurring_service import detect_recurring_expenses
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=api_schemas.DashboardSummary)
def get_dashboard_summary(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch comprehensive dashboard metrics (balances, expenses, categories, predictions, and insights)
    for the current user in a single request.
    """
    # 1. Total Balance (All-time Income - All-time Expenses)
    total_income = db.query(func.sum(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == current_user.id,
        db_models.Transaction.type == "income"
    ).scalar() or 0.0
    
    total_expenses = db.query(func.sum(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == current_user.id,
        db_models.Transaction.type == "expense"
    ).scalar() or 0.0
    
    total_balance = float(total_income - total_expenses)
    
    # 2. Get current month statistics
    stats = calculate_spending_stats(current_user.id, db)
    monthly_spending = stats["current_expenses"]
    monthly_income = stats["current_income"]
    
    # Savings (Income - Expense for current month)
    savings = float(monthly_income - monthly_spending)
    
    # 3. Category Spending list
    category_spending = []
    for cat, amt in stats["current_categories"].items():
        category_spending.append({
            "category": cat,
            "amount": amt
        })
        
    # 4. Recent Transactions (top 5 most recent)
    recent_transactions = db.query(db_models.Transaction).filter(
        db_models.Transaction.user_id == current_user.id
    ).order_by(desc(db_models.Transaction.date)).limit(5).all()
    
    # Calculate average expense for XAI descriptions
    avg_expense = db.query(func.avg(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == current_user.id,
        db_models.Transaction.type == "expense"
    ).scalar() or 0.0

    recent_out = []
    for t in recent_transactions:
        t_out = api_schemas.TransactionOut.from_orm(t)
        if t.is_anomaly:
            SUSPICIOUS_KEYWORDS = [
                "drugs", "drug", "weapons", "weapon", "beer", "whine", "wine", 
                "whiskey", "liquor", "pub", "casino", "gambling", "betting"
            ]
            desc_lower = t.description.lower()
            triggered = [kw for kw in SUSPICIOUS_KEYWORDS if kw in desc_lower]
            if triggered:
                t_out.anomaly_explanation = f"Flagged due to suspicious keyword: '{triggered[0]}' in description."
            elif avg_expense > 0 and t.amount > avg_expense:
                ratio = ((t.amount - avg_expense) / avg_expense) * 100
                t_out.anomaly_explanation = f"Amount ₹{t.amount:,.2f} is statistically anomalous. It is {ratio:.1f}% higher than your average expense of ₹{avg_expense:,.2f}."
            else:
                t_out.anomaly_explanation = "Flagged as a statistical outlier by the Isolation Forest model."
        else:
            t_out.anomaly_explanation = "Regular spending behavior."
        recent_out.append(t_out)
    
    # 5. Next month's predicted spending (latest prediction)
    today = datetime.date.today()
    if today.month == 12:
        next_month_str = f"{today.year + 1}-01"
    else:
        next_month_str = f"{today.year}-{today.month + 1:02d}"
        
    prediction = db.query(db_models.Prediction).filter(
        db_models.Prediction.user_id == current_user.id,
        db_models.Prediction.target_month == next_month_str
    ).first()
    
    pred_out = None
    if prediction:
        pred_out = api_schemas.PredictionOut.from_orm(prediction)
        pred_out.explanation = f"This spending forecast of ₹{prediction.predicted_amount:,.2f} was generated using the {prediction.model_used} model. The model analysed your monthly spending trend and weighted your recent spending averages (MAE error margin: ±₹{prediction.mae:,.2f}, R² score: {prediction.r2_score:.4f})."
    
    # 6. Fetch Insights
    insights = generate_rule_based_insights(stats)[:3] # top 3 insights
    
    # 7. Calculate Financial Health Score
    health_score = calculate_health_score(current_user.id, db)
    
    return {
        "total_balance": total_balance,
        "monthly_spending": monthly_spending,
        "savings": savings,
        "category_spending": category_spending,
        "recent_transactions": recent_out,
        "prediction": pred_out,
        "insights": insights,
        "health_score": health_score
    }


@router.get("/recurring")
def get_recurring_bills(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scan transaction history and return a list of detected recurring subscriptions and bills.
    """
    return detect_recurring_expenses(current_user.id, db)
