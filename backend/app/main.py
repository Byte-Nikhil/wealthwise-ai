import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.models import db_models

# Import API Routers
from backend.app.api import auth, dashboard, transactions, budgets, predictions, insights, reports, users, savings

# Define lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed default categories on startup
    seed_categories()
    yield

# Initialize FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for AI-Powered Personal Finance Assistant",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
# Allows requests from local React development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure database directory exists
os.makedirs("database", exist_ok=True)
os.makedirs("database/profile_pics", exist_ok=True)
os.makedirs("database/reports", exist_ok=True)

# Mount Static Files directory to serve files (profile pics, PDF reports)
app.mount("/static", StaticFiles(directory="database"), name="static")

# Create Database tables automatically on startup
Base.metadata.create_all(bind=engine)

def seed_categories():
    """
    Seed default expense categories if they do not exist.
    """
    db = SessionLocal()
    try:
        default_categories = ["Food", "Travel", "Shopping", "Bills", "Medical", "Entertainment", "Education", "Others"]
        for cat_name in default_categories:
            exists = db.query(db_models.Category).filter(db_models.Category.name == cat_name).first()
            if not exists:
                db_cat = db_models.Category(name=cat_name, is_default=True)
                db.add(db_cat)
        db.commit()
    except Exception as e:
        print(f"Error seeding default categories: {e}")
        db.rollback()
    finally:
        db.close()


# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(savings.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the AI-Powered Personal Finance Assistant API!",
        "status": "healthy",
        "documentation": "/docs"
    }
