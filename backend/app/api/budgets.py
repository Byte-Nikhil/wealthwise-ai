import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.post("", response_model=api_schemas.BudgetOut)
def set_budget(
    payload: api_schemas.BudgetCreate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Configure or update a budget limit for a category and month.
    """
    # Verify valid month format (YYYY-MM)
    try:
        datetime.datetime.strptime(payload.month, "%Y-%m")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid month format. Use 'YYYY-MM' (e.g., '2026-07')."
        )
        
    # Check if budget already exists for this category and month
    existing_budget = db.query(db_models.Budget).filter(
        db_models.Budget.user_id == current_user.id,
        db_models.Budget.category == payload.category,
        db_models.Budget.month == payload.month
    ).first()
    
    if existing_budget:
        # Update existing
        existing_budget.limit_amount = payload.limit_amount
        db.commit()
        db.refresh(existing_budget)
        return existing_budget
    else:
        # Create new
        db_budget = db_models.Budget(
            user_id=current_user.id,
            category=payload.category,
            limit_amount=payload.limit_amount,
            month=payload.month
        )
        db.add(db_budget)
        db.commit()
        db.refresh(db_budget)
        return db_budget


@router.get("", response_model=List[api_schemas.BudgetOut])
def get_budgets(
    month: Optional[str] = None,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all category budgets for the specified month. 
    Defaults to the current month if not provided.
    """
    if not month:
        month = datetime.date.today().strftime("%Y-%m")
        
    budgets = db.query(db_models.Budget).filter(
        db_models.Budget.user_id == current_user.id,
        db_models.Budget.month == month
    ).all()
    
    return budgets


@router.delete("/{budget_id}", status_code=status.HTTP_200_OK)
def delete_budget(
    budget_id: int,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a category budget.
    """
    db_budget = db.query(db_models.Budget).filter(
        db_models.Budget.id == budget_id,
        db_models.Budget.user_id == current_user.id
    ).first()
    
    if not db_budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget limit not found."
        )
        
    db.delete(db_budget)
    db.commit()
    return {"message": "Budget deleted successfully."}
