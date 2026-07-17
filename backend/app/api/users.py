import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.api.auth import get_current_user
from backend.app.core.security import verify_password, get_password_hash

router = APIRouter(prefix="/users", tags=["Profile Management"])

PROFILE_PICS_DIR = "database/profile_pics"
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

@router.get("/me", response_model=api_schemas.UserOut)
def get_me(current_user: db_models.User = Depends(get_current_user)):
    """
    Get current logged-in user profile details.
    """
    return current_user


@router.put("/me", response_model=api_schemas.UserOut)
def update_profile(
    payload: api_schemas.UserUpdate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update profile metadata (e.g., full name).
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
        
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/password", status_code=status.HTTP_200_OK)
def change_password(
    payload: api_schemas.PasswordChange,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Surgically update user password after validating the old password.
    """
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
        
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@router.post("/me/profile-picture", response_model=api_schemas.UserOut)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and configure a profile photo for the user.
    Saves the file to local disk and writes the relative URL to the user record.
    """
    # Verify file is an image
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed formats: JPG, PNG, GIF, WEBP."
        )
        
    # Generate a unique file name
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"user_{current_user.id}{file_ext}"
    filepath = os.path.join(PROFILE_PICS_DIR, filename)
    
    # Save the file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save profile picture: {str(e)}"
        )
        
    # Update user DB entry (store relative route)
    current_user.profile_picture = f"/static/profile_pics/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user
