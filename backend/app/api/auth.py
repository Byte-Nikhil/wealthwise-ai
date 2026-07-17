from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> db_models.User:
    """
    FastAPI dependency to secure endpoints.
    Decodes the JWT bearer token, validates it, and fetches the associated user.
    """
    token = credentials.credentials
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


@router.post("/signup", response_model=api_schemas.UserOut, status_code=status.HTTP_201_CREATED)
def signup(user_in: api_schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user in the system.
    """
    # Check if user already exists
    existing_user = db.query(db_models.User).filter(db_models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    # Hash password and create record
    hashed_password = get_password_hash(user_in.password)
    db_user = db_models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=api_schemas.Token)
def login(credentials: api_schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user and return a JWT access token.
    """
    user = db.query(db_models.User).filter(db_models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/forgot-password")
def forgot_password(payload: api_schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Mock password reset endpoint for educational demonstration.
    Updates the password if the user exists.
    """
    user = db.query(db_models.User).filter(db_models.User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user registered with this email"
        )
    
    # In a production environment, you would send an email with a reset link.
    # Here, we update it directly to facilitate easy local testing.
    user.hashed_password = get_password_hash(payload.password)
    db.commit()
    return {"message": "Password updated successfully."}
