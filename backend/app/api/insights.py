from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import google.generativeai as genai

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.api.auth import get_current_user
from backend.app.services.insight_service import generate_ai_insights
from backend.app.schemas import api_schemas
from backend.app.core.config import settings

router = APIRouter(prefix="/insights", tags=["Insights & Recommendations"])

@router.get("")
def get_user_insights(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate customized spending insights and actionable saving suggestions for the logged-in user.
    """
    insights_data = generate_ai_insights(current_user.id, db)
    return insights_data


@router.post("/query", response_model=api_schemas.ChatQueryOutput)
def query_financial_assistant(
    payload: api_schemas.ChatQueryInput,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search and analyze user financial transactions using natural language commands.
    """
    # Fetch all transactions to build context (limit to last 500 to keep prompt size small)
    transactions = db.query(db_models.Transaction).filter(
        db_models.Transaction.user_id == current_user.id
    ).order_by(db_models.Transaction.date.desc()).limit(500).all()
    
    # Format transactions for the AI prompt
    tx_context = []
    for t in transactions:
        tx_context.append(
            f"Date: {t.date.strftime('%Y-%m-%d')}, Desc: {t.description}, Amount: ₹{t.amount:.2f}, Type: {t.type}, Category: {t.category}, Anomaly: {'Yes' if t.is_anomaly else 'No'}"
        )
    context_str = "\n".join(tx_context)
    
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = (
            "You are a personal financial assistant chatbot for WealthWise AI. Below is the transaction history "
            f"for user {current_user.full_name or 'User'}:\n\n"
            f"{context_str}\n\n"
            f"User's Question: '{payload.query}'\n\n"
            "Please answer the user's question clearly, concisely, and supportively. Use Indian Rupee (₹) for currency. "
            "If they ask for calculations (e.g. food spending last month), calculate it accurately based on the transaction dates and amounts. "
            "Keep the reply conversational and limited to 2-4 sentences if possible. Do not include markdown code blocks."
        )
        
        response = model.generate_content(prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        print(f"Chat Search Error: {e}")
        return {"response": "I'm sorry, I was unable to parse your financial data. Please verify your Gemini API key is configured correctly."}
