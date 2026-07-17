from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.api.auth import get_current_user
from backend.app.services.insight_service import generate_ai_insights

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
