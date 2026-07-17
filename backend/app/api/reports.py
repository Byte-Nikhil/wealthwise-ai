import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.api.auth import get_current_user
from backend.app.services.pdf_service import generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])

# Static directory to persist reports
REPORTS_DIR = "database/reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

@router.post("/generate", response_model=api_schemas.ReportOut)
def trigger_report_generation(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compile financial analysis, charts, predictions, and anomalies into a downloadable PDF.
    """
    try:
        # Generate PDF to a temporary location
        temp_pdf_path = generate_pdf_report(current_user.id, db)
        
        # Move PDF to our reports directory for persistence
        filename = os.path.basename(temp_pdf_path)
        persistent_path = os.path.join(REPORTS_DIR, filename)
        
        # Replace if file exists
        if os.path.exists(persistent_path):
            os.remove(persistent_path)
            
        os.rename(temp_pdf_path, persistent_path)
        
        # Register the report in the database
        db_report = db_models.Report(
            user_id=current_user.id,
            name=f"Financial_Report_{filename.split('_')[-1]}",  # E.g., Financial_Report_2026-07.pdf
            file_path=persistent_path
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )


@router.get("", response_model=List[api_schemas.ReportOut])
def list_reports(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all generated reports for the current user.
    """
    reports = db.query(db_models.Report).filter(
        db_models.Report.user_id == current_user.id
    ).order_by(db_models.Report.created_at.desc()).all()
    return reports


@router.get("/download/{report_id}")
def download_report(
    report_id: int,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download a specific PDF report by ID.
    """
    report = db.query(db_models.Report).filter(
        db_models.Report.id == report_id,
        db_models.Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found."
        )
        
    if not os.path.exists(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical PDF file does not exist on disk."
        )
        
    return FileResponse(
        path=report.file_path,
        filename=os.path.basename(report.file_path),
        media_type="application/pdf"
    )
