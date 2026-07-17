from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date as dt_date, datetime as dt_datetime

# --- AUTHENTICATION SCHEMAS ---

class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str

class UserOut(BaseModel):
    """Schema for user public output representation."""
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: dt_datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Schema to update user profile."""
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None

class PasswordChange(BaseModel):
    """Schema for changing password."""
    old_password: str
    new_password: str = Field(..., min_length=6)

class Token(BaseModel):
    """JWT Token response schema."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """JWT Token payload contents."""
    user_id: Optional[int] = None


class TransactionCreate(BaseModel):
    """Schema for creating a new transaction."""
    date: dt_date
    description: str
    amount: float = Field(..., gt=0, description="Amount must be positive")
    type: str = Field(..., description="'income' or 'expense'")
    category: str = Field("Others", description="Expense/Income category")

class TransactionOut(BaseModel):
    """Schema for returning transaction details."""
    id: int
    user_id: int
    date: dt_date
    description: str
    amount: float
    type: str
    category: str
    is_anomaly: bool
    anomaly_score: Optional[float] = None
    anomaly_explanation: Optional[str] = None
    created_at: dt_datetime

    class Config:
        from_attributes = True

class TransactionUpdate(BaseModel):
    """Schema for updating an existing transaction."""
    date: Optional[dt_date] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[str] = None
    category: Optional[str] = None


# --- BUDGET SCHEMAS ---

class BudgetCreate(BaseModel):
    """Schema for creating or configuring a monthly budget limit."""
    category: str
    limit_amount: float = Field(..., gt=0)
    month: str = Field(..., description="Format YYYY-MM, e.g. 2026-07")

class BudgetOut(BaseModel):
    """Schema for returning budget configurations."""
    id: int
    category: str
    limit_amount: float
    month: str
    created_at: dt_datetime

    class Config:
        from_attributes = True


# --- PREDICTION SCHEMAS ---

class PredictionOut(BaseModel):
    """Schema for ML Spending prediction outputs."""
    id: int
    target_month: str
    predicted_amount: float
    model_used: str
    mae: Optional[float] = None
    rmse: Optional[float] = None
    r2_score: Optional[float] = None
    explanation: Optional[str] = None
    created_at: dt_datetime

    class Config:
        from_attributes = True


# --- REPORT SCHEMAS ---

class ReportOut(BaseModel):
    """Schema for generated PDF report records."""
    id: int
    name: str
    file_path: str
    created_at: dt_datetime

    class Config:
        from_attributes = True


# --- DASHBOARD SUMMARY SCHEMA ---
class DashboardSummary(BaseModel):
    """Custom schema representing overall dashboard metrics."""
    total_balance: float
    monthly_spending: float
    savings: float
    category_spending: List[dict]
    recent_transactions: List[TransactionOut]
    prediction: Optional[PredictionOut] = None
    insights: List[str]
    health_score: float


class PaginatedTransactions(BaseModel):
    """Schema for paginated transaction listings."""
    transactions: List[TransactionOut]
    total_count: int
    page: int
    limit: int


# --- SAVINGS GOAL SCHEMAS ---
class SavingsGoalCreate(BaseModel):
    """Schema for creating a new savings target."""
    name: str
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(0.0, ge=0)
    target_date: Optional[dt_date] = None

class SavingsGoalOut(BaseModel):
    """Schema for returning savings target details."""
    id: int
    user_id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: Optional[dt_date] = None
    created_at: dt_datetime

    class Config:
        from_attributes = True

class SavingsGoalUpdate(BaseModel):
    """Schema for updating an existing savings target."""
    name: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    target_date: Optional[dt_date] = None


# --- CHAT / NATURAL LANGUAGE SEARCH SCHEMAS ---
class ChatQueryInput(BaseModel):
    """Schema for user chat/search input queries."""
    query: str

class ChatQueryOutput(BaseModel):
    """Schema for returning conversational AI responses."""
    response: str

