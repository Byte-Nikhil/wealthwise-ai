import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/savings", tags=["Savings Goals"])

@router.post("", response_model=api_schemas.SavingsGoalOut)
def create_savings_goal(
    payload: api_schemas.SavingsGoalCreate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new savings goal target.
    """
    db_goal = db_models.SavingsGoal(
        user_id=current_user.id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount,
        target_date=payload.target_date
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.get("", response_model=List[api_schemas.SavingsGoalOut])
def get_savings_goals(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all savings goals for the current user.
    """
    goals = db.query(db_models.SavingsGoal).filter(
        db_models.SavingsGoal.user_id == current_user.id
    ).all()
    return goals

@router.put("/{goal_id}", response_model=api_schemas.SavingsGoalOut)
def update_savings_goal(
    goal_id: int,
    payload: api_schemas.SavingsGoalUpdate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update details of an existing savings goal (or add funds).
    """
    db_goal = db.query(db_models.SavingsGoal).filter(
        db_models.SavingsGoal.id == goal_id,
        db_models.SavingsGoal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings goal not found."
        )
        
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(db_goal, key, value)
        
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.delete("/{goal_id}", status_code=status.HTTP_200_OK)
def delete_savings_goal(
    goal_id: int,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a savings goal.
    """
    db_goal = db.query(db_models.SavingsGoal).filter(
        db_models.SavingsGoal.id == goal_id,
        db_models.SavingsGoal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings goal not found."
        )
        
    db.delete(db_goal)
    db.commit()
    return {"detail": "Savings goal deleted successfully."}
