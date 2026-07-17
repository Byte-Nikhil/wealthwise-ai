import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

class Settings:
    # Application settings
    APP_NAME: str = "WealthWise AI"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Security and JWT Auth
    # In production, this must be a secure random key. We provide a default for local development.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_jwt_signing_key_for_personal_finance_12345!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # Default: 24 hours
    
    # Database Settings
    # Path is relative to the root directory where uvicorn is run
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database/finance.db")
    
    # AI Gemini API Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# Instantiate settings
settings = Settings()
