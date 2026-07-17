import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import google.generativeai as genai

from backend.app.models import db_models
from backend.app.core.config import settings

def calculate_spending_stats(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes mathematical financial summaries for current and previous months.
    """
    today = datetime.date.today()
    current_year_month = today.strftime("%Y-%m")
    
    # Calculate previous month date
    first_day_current = today.replace(day=1)
    last_day_prev = first_day_current - datetime.timedelta(days=1)
    prev_year_month = last_day_prev.strftime("%Y-%m")
    
    # 1. Total expenses current vs previous month
    curr_expenses_query = db.query(func.sum(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense",
        func.strftime("%Y-%m", db_models.Transaction.date) == current_year_month
    ).scalar()
    curr_expenses = float(curr_expenses_query) if curr_expenses_query else 0.0
    
    prev_expenses_query = db.query(func.sum(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense",
        func.strftime("%Y-%m", db_models.Transaction.date) == prev_year_month
    ).scalar()
    prev_expenses = float(prev_expenses_query) if prev_expenses_query else 0.0
    
    # 2. Income current vs previous month
    curr_income_query = db.query(func.sum(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "income",
        func.strftime("%Y-%m", db_models.Transaction.date) == current_year_month
    ).scalar()
    curr_income = float(curr_income_query) if curr_income_query else 0.0

    # 3. Category breakdown for current month
    curr_categories = db.query(
        db_models.Transaction.category,
        func.sum(db_models.Transaction.amount)
    ).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense",
        func.strftime("%Y-%m", db_models.Transaction.date) == current_year_month
    ).group_by(db_models.Transaction.category).all()
    
    curr_cat_map = {cat: float(amt) for cat, amt in curr_categories}
    
    # 4. Category breakdown for previous month
    prev_categories = db.query(
        db_models.Transaction.category,
        func.sum(db_models.Transaction.amount)
    ).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense",
        func.strftime("%Y-%m", db_models.Transaction.date) == prev_year_month
    ).group_by(db_models.Transaction.category).all()
    
    prev_cat_map = {cat: float(amt) for cat, amt in prev_categories}
    
    # 5. Weekend vs Weekday spending
    # SQLite strftime('%w', date) returns '0' for Sunday, '6' for Saturday
    weekend_spending_query = db.query(func.sum(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense",
        func.strftime("%Y-%m", db_models.Transaction.date) == current_year_month,
        func.strftime("%w", db_models.Transaction.date).in_(["0", "6"])
    ).scalar()
    weekend_spending = float(weekend_spending_query) if weekend_spending_query else 0.0
    
    weekday_spending_query = db.query(func.sum(db_models.Transaction.amount)).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense",
        func.strftime("%Y-%m", db_models.Transaction.date) == current_year_month,
        func.strftime("%w", db_models.Transaction.date).in_(["1", "2", "3", "4", "5"])
    ).scalar()
    weekday_spending = float(weekday_spending_query) if weekday_spending_query else 0.0

    # 6. Active budgets
    budgets = db.query(db_models.Budget).filter(
        db_models.Budget.user_id == user_id,
        db_models.Budget.month == current_year_month
    ).all()
    budget_map = {b.category: b.limit_amount for b in budgets}
    
    return {
        "current_month": current_year_month,
        "previous_month": prev_year_month,
        "current_expenses": curr_expenses,
        "previous_expenses": prev_expenses,
        "current_income": curr_income,
        "current_categories": curr_cat_map,
        "previous_categories": prev_cat_map,
        "weekend_spending": weekend_spending,
        "weekday_spending": weekday_spending,
        "budgets": budget_map
    }

def generate_rule_based_insights(stats: Dict[str, Any]) -> List[str]:
    """
    Generates deterministic rule-based insights when Gemini API is unavailable.
    """
    insights = []
    curr_expenses = stats["current_expenses"]
    prev_expenses = stats["previous_expenses"]
    curr_cat = stats["current_categories"]
    prev_cat = stats["previous_categories"]
    budgets = stats["budgets"]
    
    # 1. Total monthly comparison
    if prev_expenses > 0:
        pct_change = ((curr_expenses - prev_expenses) / prev_expenses) * 100
        if pct_change > 10:
            insights.append(f"Your total spending increased by {pct_change:.1f}% compared to last month.")
        elif pct_change < -10:
            insights.append(f"Great job! Your total spending decreased by {abs(pct_change):.1f}% compared to last month.")
            
    # 2. Category specific increases/decreases
    for category in set(curr_cat.keys()).union(prev_cat.keys()):
        curr_amt = curr_cat.get(category, 0.0)
        prev_amt = prev_cat.get(category, 0.0)
        
        if prev_amt > 0:
            cat_pct = ((curr_amt - prev_amt) / prev_amt) * 100
            if cat_pct >= 15:
                insights.append(f"Spending on {category} increased by {cat_pct:.1f}% this month.")
            elif cat_pct <= -15:
                insights.append(f"Spending on {category} decreased by {abs(cat_pct):.1f}% this month.")
        elif curr_amt > 150:
            insights.append(f"You registered new spending of ₹{curr_amt:.2f} on {category} this month.")
            
    # 3. Weekend vs Weekday trend
    if stats["weekend_spending"] > stats["weekday_spending"]:
        insights.append("Most of your spending happens on weekends (Saturday & Sunday).")
        
    # 4. Highest category
    if curr_cat:
        highest_cat = max(curr_cat, key=curr_cat.get)
        insights.append(f"Your highest expense category is {highest_cat} (₹{curr_cat[highest_cat]:.2f}).")
        
    # 5. Budget violations
    for cat, limit in budgets.items():
        curr_amt = curr_cat.get(cat, 0.0)
        if curr_amt > limit:
            over_amt = curr_amt - limit
            insights.append(f"Alert: {cat} expenses (₹{curr_amt:.2f}) exceed your monthly budget of ₹{limit:.2f} by ₹{over_amt:.2f}!")

    # 6. Default tips if insights are sparse
    if not insights:
        insights.append("Start adding daily transactions or upload a bank statement to generate detailed spending insights.")
        insights.append("Consider setting up a category budget to keep your spending in check.")
        
    return insights

def generate_savings_recommendations(stats: Dict[str, Any]) -> List[str]:
    """
    Generates rule-based actionable saving recommendations.
    """
    recommendations = []
    curr_cat = stats["current_categories"]
    budgets = stats["budgets"]
    
    # Look for food spending
    food_spend = curr_cat.get("Food", 0.0)
    if food_spend > 300:
        recommendations.append("Reduce restaurant dining and food delivery spending. Preparing meals at home can save up to 40%.")
        
    # Shopping
    shop_spend = curr_cat.get("Shopping", 0.0)
    if shop_spend > 200:
        recommendations.append("Limit impulsive online shopping. Try waiting 48 hours before checking out items in your cart.")
        
    # Entertainment
    ent_spend = curr_cat.get("Entertainment", 0.0)
    if ent_spend > 150:
        recommendations.append("Look for free or low-cost entertainment options (e.g., public events, parks, subscription audits).")
        
    # Budgets check
    if budgets:
        recommendations.append("Monitor categories approaching their limits to avoid overspending.")
    else:
        recommendations.append("Create a monthly budget limits for Food, Shopping, and Travel to start saving systematically.")
        
    recommendations.append("Target a 10% savings rate this month by setting aside a fixed amount on pay day.")
    
    return recommendations

def generate_ai_insights(user_id: int, db: Session) -> Dict[str, List[str]]:
    """
    Orchestrates the generation of insights & recommendations.
    Uses Gemini LLM if key is available; otherwise falls back to local rules.
    """
    stats = calculate_spending_stats(user_id, db)
    rules_insights = generate_rule_based_insights(stats)
    rules_recommendations = generate_savings_recommendations(stats)
    
    if not settings.GEMINI_API_KEY:
        return {
            "insights": rules_insights,
            "recommendations": rules_recommendations
        }
        
    try:
        # Configure Gemini Client
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Build prompt
        prompt = f"""
        You are an expert personal finance coach. Analyze the following spending statistics for this user (values in Indian Rupees ₹):
        - Current Month: {stats['current_month']}
        - Total expenses this month: ₹{stats['current_expenses']:.2f} (compared to last month's ₹{stats['previous_expenses']:.2f})
        - Total income this month: ₹{stats['current_income']:.2f}
        - Current spending by category: {stats['current_categories']}
        - Previous spending by category: {stats['previous_categories']}
        - Weekend spending: ₹{stats['weekend_spending']:.2f} vs Weekday spending: ₹{stats['weekday_spending']:.2f}
        - Configured Budgets: {stats['budgets']}

        Based on these stats, generate:
        1. A list of 4-5 core observations (e.g., where they are spending too much, significant changes, trends).
        2. A list of 3-4 actionable savings recommendations or recommendations.
        
        Be direct, friendly, and practical. Return the result in a clean plain-text format where each observation starts with "OBS: " and each recommendation starts with "REC: ". Do not include markdown formatting or headings.
        """
        
        response = model.generate_content(prompt)
        text = response.text
        
        llm_insights = []
        llm_recs = []
        
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("OBS:"):
                llm_insights.append(line.replace("OBS:", "").strip())
            elif line.startswith("REC:"):
                llm_recs.append(line.replace("REC:", "").strip())
                
        # If LLM didn't return properly formatted strings, fall back
        return {
            "insights": llm_insights if llm_insights else rules_insights,
            "recommendations": llm_recs if llm_recs else rules_recommendations
        }
        
    except Exception as e:
        # On any API errors, fallback immediately
        print(f"Gemini LLM error: {e}. Falling back to rule-based insights.")
        return {
            "insights": rules_insights,
            "recommendations": rules_recommendations
        }
