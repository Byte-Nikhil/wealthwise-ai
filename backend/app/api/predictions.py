import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.api.auth import get_current_user
from backend.app.services.ml_service import predict_next_month_expenses, detect_anomalies

router = APIRouter(prefix="/predictions", tags=["Machine Learning"])

@router.post("/predict", response_model=api_schemas.PredictionOut)
def run_prediction(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Train regression models on user's monthly spending history and predict next month's expense.
    Saves the prediction to the database.
    """
    result = predict_next_month_expenses(current_user.id, db)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
        
    # Calculate next month YYYY-MM
    today = datetime.date.today()
    # Simple increment month logic
    if today.month == 12:
        next_month_date = datetime.date(today.year + 1, 1, 1)
    else:
        next_month_date = datetime.date(today.year, today.month + 1, 1)
    next_month_str = next_month_date.strftime("%Y-%m")
    
    # Store or update the prediction in the database
    existing_pred = db.query(db_models.Prediction).filter(
        db_models.Prediction.user_id == current_user.id,
        db_models.Prediction.target_month == next_month_str
    ).first()
    
    if existing_pred:
        existing_pred.predicted_amount = result["prediction"]
        existing_pred.model_used = result["model_used"]
        existing_pred.mae = result["mae"]
        existing_pred.rmse = result["rmse"]
        existing_pred.r2_score = result["r2_score"]
        db.commit()
        db.refresh(existing_pred)
        return existing_pred
    else:
        db_pred = db_models.Prediction(
            user_id=current_user.id,
            target_month=next_month_str,
            predicted_amount=result["prediction"],
            model_used=result["model_used"],
            mae=result["mae"],
            rmse=result["rmse"],
            r2_score=result["r2_score"]
        )
        db.add(db_pred)
        db.commit()
        db.refresh(db_pred)
        return db_pred


@router.post("/anomalies")
def run_anomaly_detection(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Train Isolation Forest model on user's transactions to find and flag anomalous expenses.
    """
    count, flagged = detect_anomalies(current_user.id, db)
    return {
        "message": f"Anomaly detection completed. Flagged {count} transactions.",
        "anomalies_count": count,
        "flagged_transactions": flagged
    }
