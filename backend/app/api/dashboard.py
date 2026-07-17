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
    
    # 6. Fetch Insights
    insights = generate_rule_based_insights(stats)[:3] # top 3 insights
    
    # 7. Calculate Financial Health Score
    health_score = calculate_health_score(current_user.id, db)
    
    return {
        "total_balance": total_balance,
        "monthly_spending": monthly_spending,
        "savings": savings,
        "category_spending": category_spending,
        "recent_transactions": recent_transactions,
        "prediction": prediction,
        "insights": insights,
        "health_score": health_score
    }
