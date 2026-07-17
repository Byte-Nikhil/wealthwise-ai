import csv
import io
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from backend.app.core.database import get_db
from backend.app.models import db_models
from backend.app.schemas import api_schemas
from backend.app.api.auth import get_current_user
from backend.app.services.ml_service import predict_category

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("", response_model=api_schemas.TransactionOut)
def create_transaction(
    payload: api_schemas.TransactionCreate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually add a transaction. 
    If the transaction is an expense and category is 'Others' or default, 
    the system automatically classifies the expense.
    """
    category = payload.category
    # Auto-classify category if explicitly requested as 'Auto' or left empty
    if payload.type == "expense" and (category == "Auto" or not category):
        category = predict_category(payload.description)
        
    db_transaction = db_models.Transaction(
        user_id=current_user.id,
        date=payload.date,
        description=payload.description,
        amount=payload.amount,
        type=payload.type,
        category=category
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


@router.get("", response_model=api_schemas.PaginatedTransactions)
def get_transactions(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    is_anomaly: Optional[bool] = None,
    sort_by: str = "date",  # 'date' or 'amount'
    sort_order: str = "desc", # 'asc' or 'desc'
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List user transactions with support for searching, filtering, sorting, and pagination.
    """
    query = db.query(db_models.Transaction).filter(db_models.Transaction.user_id == current_user.id)
    
    # 1. Apply Search
    if search:
        query = query.filter(db_models.Transaction.description.ilike(f"%{search}%"))
        
    # 2. Apply Filters
    if category:
        query = query.filter(db_models.Transaction.category == category)
    if type:
        query = query.filter(db_models.Transaction.type == type)
    if is_anomaly is not None:
        query = query.filter(db_models.Transaction.is_anomaly == is_anomaly)
        
    # 3. Apply Sorting
    sort_field = db_models.Transaction.date if sort_by == "date" else db_models.Transaction.amount
    if sort_order == "desc":
        query = query.order_by(desc(sort_field), desc(db_models.Transaction.id))
    else:
        query = query.order_by(asc(sort_field), asc(db_models.Transaction.id))
        
    # 4. Calculate total for pagination
    total_count = query.count()
    
    # 5. Apply Pagination
    offset = (page - 1) * limit
    transactions = query.offset(offset).limit(limit).all()
    
    return {
        "transactions": transactions,
        "total_count": total_count,
        "page": page,
        "limit": limit
    }


@router.put("/{transaction_id}", response_model=api_schemas.TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: api_schemas.TransactionUpdate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Edit an existing transaction.
    """
    db_transaction = db.query(db_models.Transaction).filter(
        db_models.Transaction.id == transaction_id,
        db_models.Transaction.user_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
        
    # Update fields
    for key, value in payload.dict(exclude_unset=True).items():
        if key == "category" and value == "Auto" and (payload.type == "expense" if payload.type else db_transaction.type == "expense"):
            desc_val = payload.description if payload.description else db_transaction.description
            value = predict_category(desc_val)
        setattr(db_transaction, key, value)
        
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_200_OK)
def delete_transaction(
    transaction_id: int,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a transaction.
    """
    db_transaction = db.query(db_models.Transaction).filter(
        db_models.Transaction.id == transaction_id,
        db_models.Transaction.user_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
        
    db.delete(db_transaction)
    db.commit()
    return {"message": "Transaction deleted successfully."}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_bank_statement(
    file: UploadFile = File(...),
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload bank statements in CSV format.
    Required Columns: Date, Description, Amount, Transaction Type.
    Automatically cleans dates and predicts transaction categories.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid file format. Only CSV files are allowed."
        )
        
    contents = await file.read()
    decoded = contents.decode("utf-8")
    csv_file = io.StringIO(decoded)
    
    # Read CSV
    reader = csv.DictReader(csv_file)
    
    # Check headers
    headers = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []
    required_cols = ["Date", "Description", "Amount", "Transaction Type"]
    
    # Find matching headers (case-insensitive)
    header_mapping = {}
    for req in required_cols:
        matched = next((h for h in headers if h.lower() == req.lower()), None)
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required CSV column: '{req}'."
            )
        header_mapping[req] = matched

    inserted_count = 0
    errors = []
    
    # Parse and clean rows
    for row_idx, row in enumerate(reader, start=1):
        try:
            # Extract raw values
            raw_date = row.get(header_mapping["Date"], "").strip()
            raw_desc = row.get(header_mapping["Description"], "").strip()
            raw_amount = row.get(header_mapping["Amount"], "").strip()
            raw_type = row.get(header_mapping["Transaction Type"], "").strip()
            
            if not raw_date or not raw_desc or not raw_amount or not raw_type:
                continue # Skip empty rows
                
            # 1. Clean Date
            parsed_date = None
            # Try common date formats
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
                try:
                    parsed_date = datetime.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    continue
            if not parsed_date:
                raise ValueError(f"Unrecognized date format: '{raw_date}'")
                
            # 2. Clean Amount
            # Clean currency symbols and commas
            clean_amount_str = raw_amount.replace("$", "").replace(",", "").strip()
            amount_val = abs(float(clean_amount_str))
            
            # 3. Clean Transaction Type
            type_val = raw_type.lower()
            if "inc" in type_val or "+" in type_val:
                type_val = "income"
            else:
                type_val = "expense"
                
            # 4. Predict Category
            if type_val == "expense":
                category_val = predict_category(raw_desc)
            else:
                category_val = "Income"
                
            # Create transaction record
            db_tx = db_models.Transaction(
                user_id=current_user.id,
                date=parsed_date,
                description=raw_desc,
                amount=amount_val,
                type=type_val,
                category=category_val
            )
            db.add(db_tx)
            inserted_count += 1
            
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")
            
    if inserted_count > 0:
        db.commit()
        
    return {
        "message": f"Successfully imported {inserted_count} transactions.",
        "skipped_rows_errors": errors
    }


@router.get("/export")
def export_transactions_csv(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export all user transactions into a downloadable CSV file.
    """
    transactions = db.query(db_models.Transaction).filter(
        db_models.Transaction.user_id == current_user.id
    ).order_by(desc(db_models.Transaction.date)).all()
    
    # Generate CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Date", "Description", "Amount", "Transaction Type", "Category", "Is Anomaly"])
    
    # Write rows
    for t in transactions:
        writer.writerow([
            t.date.strftime("%Y-%m-%d"),
            t.description,
            t.amount,
            t.type,
            t.category,
            "Yes" if t.is_anomaly else "No"
        ])
        
    output.seek(0)
    
    headers = {
        "Content-Disposition": f"attachment; filename=transactions_export_{current_user.id}.csv"
    }
    
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv", headers=headers)
