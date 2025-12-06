from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import io
import csv
import json
import zipfile
import time
import shutil
from datetime import datetime, timezone
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .database import engine, get_db, Base
from .models import User, Slot, SlotEntry, ActivityLog, Analysis, EntryEditHistory, Detection
from .vision import ThreadRollDetector
from .auth import (
    hash_password, verify_password, create_token, invalidate_token,
    get_current_user, get_admin_user, get_manager_or_admin_user, create_default_admin
)
from .redis_client import cache_get, cache_set, cache_delete, cache_clear_pattern
from .logger import logger
from .image_validator import ImageValidator

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Thread Roll Counter API", version="2.0.0")

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - Restricted for production
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:1111,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS origins configured: {CORS_ORIGINS}")

# Create upload directories
UPLOAD_DIR = "uploads"
ANNOTATED_DIR = "uploads/annotated"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ANNOTATED_DIR, exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Initialize detector
detector = ThreadRollDetector()

# Initialize image validator
image_validator = ImageValidator(upload_dir=UPLOAD_DIR)

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"

class UserUpdate(BaseModel):
    password: Optional[str] = None
    is_active: Optional[bool] = None

class SlotCreate(BaseModel):
    name: str
    description: Optional[str] = None

class EntryUpdate(BaseModel):
    final_count: Optional[int] = None
    final_colors: Optional[Dict[str, int]] = None
    wrongly_marked: Optional[int] = None

class BoundingBox(BaseModel):
    x: float  # Left position as percentage (0-100)
    y: float  # Top position as percentage (0-100)
    width: float  # Width as percentage
    height: float  # Height as percentage
    label: str = "Thread Roll"
    color: Optional[str] = None
    confidence: Optional[float] = None

class SaveCorrectionsRequest(BaseModel):
    entry_id: int
    corrected_boxes: List[BoundingBox]

class ImageValidationRequest(BaseModel):
    image_url: str
    annotated_url: Optional[str] = None

# Startup event
@app.on_event("startup")
async def startup_event():
    db = next(get_db())
    create_default_admin(db)
    db.close()
    logger.info("Application started successfully")

# ============ HEALTH CHECK ============
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Thread Roll Counter API",
        "version": "2.0.0",
        "docs": "/docs"
    }

# ============ IMAGE VALIDATION ENDPOINTS ============
@app.post("/api/validate-image")
async def validate_image_url(request: ImageValidationRequest):
    """
    Validate image URLs and check if files exist
    Returns fixed URLs or placeholders for broken images
    """
    result = image_validator.validate_entry_images(
        image_url=request.image_url,
        annotated_url=request.annotated_url
    )

    return {
        "original": {
            "url": request.image_url,
            "is_valid": result["original"]["is_valid"],
            "file_exists": result["original"]["file_exists"],
            "fixed_url": result["original"]["suggested_url"],
            "error": result["original"]["error"]
        },
        "annotated": {
            "url": request.annotated_url,
            "is_valid": result["annotated"]["is_valid"] if result["annotated"] else None,
            "file_exists": result["annotated"]["file_exists"] if result["annotated"] else None,
            "fixed_url": result["annotated"]["suggested_url"] if result["annotated"] else None,
            "error": result["annotated"]["error"] if result["annotated"] else None
        } if request.annotated_url else None,
        "both_valid": result["both_valid"]
    }

@app.get("/api/validate-image/{path:path}")
async def validate_image_path(path: str):
    """
    Validate a single image path
    Usage: GET /api/validate-image/uploads/image.jpg
    """
    url = f"/{path}"
    result = image_validator.validate_url(url)

    return {
        "url": url,
        "is_valid": result["is_valid"],
        "file_exists": result["file_exists"],
        "fixed_url": result["suggested_url"],
        "error": result["error"],
        "info": image_validator.get_image_info(url) if result["is_valid"] else None
    }

@app.get("/api/image-info/{path:path}")
async def get_image_info(path: str):
    """
    Get detailed information about an image
    Usage: GET /api/image-info/uploads/image.jpg
    """
    url = f"/{path}"
    info = image_validator.get_image_info(url)

    if not info:
        raise HTTPException(status_code=404, detail="Image not found")

    return info

# ============ AUTH ENDPOINTS ============
@app.post("/api/auth/login")
@limiter.limit("5/minute")  # Rate limit: 5 attempts per minute
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for user: {login_data.username}")

    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        logger.warning(f"Failed login attempt for user: {login_data.username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        logger.warning(f"Login attempt for inactive user: {login_data.username}")
        raise HTTPException(status_code=401, detail="Account is disabled")

    token = create_token(user.id)
    logger.info(f"Successful login: {user.username}")

    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }

@app.post("/api/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role
    }

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@app.post("/api/auth/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    current_user.password_hash = hash_password(request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

# ============ ADMIN ENDPOINTS ============
@app.get("/api/admin/users")
async def get_users(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return [{
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat()
    } for u in users]

@app.post("/api/admin/users")
async def create_user(
    user_data: UserCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"id": user.id, "username": user.username, "role": user.role}

@app.put("/api/admin/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.password:
        user.password_hash = hash_password(user_data.password)
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    db.commit()
    return {"message": "User updated successfully"}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.get("/api/admin/activity")
async def get_activity_logs(
    limit: int = 100,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        slot = db.query(Slot).filter(Slot.id == log.slot_id).first() if log.slot_id else None
        result.append({
            "id": log.id,
            "user": user.username if user else "Unknown",
            "user_id": log.user_id,
            "slot": slot.name if slot else None,
            "slot_id": log.slot_id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat()
        })
    return result

@app.get("/api/admin/dashboard")
async def get_admin_dashboard(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    # Try to get from cache first
    cache_key = "admin:dashboard"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    total_users = db.query(User).filter(User.role == "user").count()
    total_managers = db.query(User).filter(User.role == "manager").count()
    total_slots = db.query(Slot).count()
    total_entries = db.query(SlotEntry).count()
    submitted_entries = db.query(SlotEntry).filter(SlotEntry.is_submitted == True).count()
    
    # Recent activity
    recent_logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(10).all()
    recent_activity = []
    for log in recent_logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        slot = db.query(Slot).filter(Slot.id == log.slot_id).first() if log.slot_id else None
        recent_activity.append({
            "user": user.username if user else "Unknown",
            "slot": slot.name if slot else None,
            "action": log.action,
            "timestamp": log.timestamp.isoformat()
        })
    
    result = {
        "total_users": total_users,
        "total_managers": total_managers,
        "total_slots": total_slots,
        "total_entries": total_entries,
        "submitted_entries": submitted_entries,
        "recent_activity": recent_activity
    }
    
    # Cache for 60 seconds
    cache_set(cache_key, result, ex=60)
    return result

# ============ MANAGER ENDPOINTS ============
@app.get("/api/manager/users")
async def get_manager_users(
    manager: User = Depends(get_manager_or_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (for managers and admins)"""
    users = db.query(User).filter(User.role == "user").all()
    result = []
    for u in users:
        # Get user's slot count
        slot_count = db.query(Slot).filter(Slot.created_by == u.id).count()
        # Get user's entry count
        entry_count = db.query(SlotEntry).join(Slot).filter(Slot.created_by == u.id).count()
        # Get submitted count
        submitted_count = db.query(SlotEntry).join(Slot).filter(
            Slot.created_by == u.id,
            SlotEntry.is_submitted == True
        ).count()
        
        result.append({
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
            "slot_count": slot_count,
            "entry_count": entry_count,
            "submitted_count": submitted_count
        })
    return result

@app.get("/api/manager/users/{user_id}/slots")
async def get_user_slots_for_manager(
    user_id: int,
    manager: User = Depends(get_manager_or_admin_user),
    db: Session = Depends(get_db)
):
    """Get all slots for a specific user (manager view)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    slots = db.query(Slot).filter(Slot.created_by == user_id).order_by(Slot.created_at.desc()).all()
    result = []
    for slot in slots:
        entry_count = db.query(SlotEntry).filter(SlotEntry.slot_id == slot.id).count()
        latest_entry = db.query(SlotEntry).filter(SlotEntry.slot_id == slot.id).order_by(SlotEntry.created_at.desc()).first()
        submitted_count = db.query(SlotEntry).filter(
            SlotEntry.slot_id == slot.id,
            SlotEntry.is_submitted == True
        ).count()
        
        result.append({
            "id": slot.id,
            "name": slot.name,
            "description": slot.description,
            "created_at": slot.created_at.isoformat(),
            "entry_count": entry_count,
            "submitted_count": submitted_count,
            "latest_count": latest_entry.final_count if latest_entry else 0,
            "latest_update": latest_entry.updated_at.isoformat() if latest_entry else None
        })
    
    return {
        "user": {
            "id": user.id,
            "username": user.username
        },
        "slots": result
    }

@app.get("/api/manager/all-slots")
async def get_all_slots_for_manager(
    manager: User = Depends(get_manager_or_admin_user),
    db: Session = Depends(get_db)
):
    """Get all slots from all users (manager/admin view)"""
    # Try cache first
    cache_key = "manager:all_slots"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    slots = db.query(Slot).order_by(Slot.created_at.desc()).all()
    result = []
    for slot in slots:
        entry_count = db.query(SlotEntry).filter(SlotEntry.slot_id == slot.id).count()
        latest_entry = db.query(SlotEntry).filter(SlotEntry.slot_id == slot.id).order_by(SlotEntry.created_at.desc()).first()
        creator = db.query(User).filter(User.id == slot.created_by).first()
        submitted_count = db.query(SlotEntry).filter(
            SlotEntry.slot_id == slot.id,
            SlotEntry.is_submitted == True
        ).count()
        
        result.append({
            "id": slot.id,
            "name": slot.name,
            "description": slot.description,
            "created_at": slot.created_at.isoformat(),
            "created_by": creator.username if creator else "Unknown",
            "created_by_id": slot.created_by,
            "entry_count": entry_count,
            "submitted_count": submitted_count,
            "latest_count": latest_entry.final_count if latest_entry else 0,
            "latest_update": latest_entry.updated_at.isoformat() if latest_entry else None
        })
    
    # Cache for 30 seconds
    cache_set(cache_key, result, ex=30)
    return result

@app.get("/api/manager/dashboard")
async def get_manager_dashboard(
    manager: User = Depends(get_manager_or_admin_user),
    db: Session = Depends(get_db)
):
    """Dashboard for managers showing overview of all users and slots"""
    # Try cache first
    cache_key = "manager:dashboard"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    total_users = db.query(User).filter(User.role == "user").count()
    total_slots = db.query(Slot).count()
    total_entries = db.query(SlotEntry).count()
    submitted_entries = db.query(SlotEntry).filter(SlotEntry.is_submitted == True).count()
    total_threads = db.query(func.sum(SlotEntry.final_count)).filter(SlotEntry.is_submitted == True).scalar() or 0
    
    # Top users by slots
    top_users = db.query(
        User.username,
        func.count(Slot.id).label('slot_count')
    ).join(Slot, Slot.created_by == User.id).group_by(User.username).order_by(
        func.count(Slot.id).desc()
    ).limit(5).all()
    
    # Recent activity
    recent_logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(15).all()
    recent_activity = []
    for log in recent_logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        slot = db.query(Slot).filter(Slot.id == log.slot_id).first() if log.slot_id else None
        recent_activity.append({
            "user": user.username if user else "Unknown",
            "slot": slot.name if slot else None,
            "action": log.action,
            "timestamp": log.timestamp.isoformat()
        })
    
    result = {
        "total_users": total_users,
        "total_slots": total_slots,
        "total_entries": total_entries,
        "submitted_entries": submitted_entries,
        "total_threads": total_threads,
        "top_users": [{"username": u[0], "slot_count": u[1]} for u in top_users],
        "recent_activity": recent_activity
    }
    
    # Cache for 60 seconds
    cache_set(cache_key, result, ex=60)
    return result

@app.get("/api/user/dashboard")
async def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Try cache first (user-specific cache)
    cache_key = f"user:dashboard:{current_user.id}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    # User's slots
    user_slots = db.query(Slot).filter(Slot.created_by == current_user.id).count()

    # User's total entries
    user_entries = db.query(SlotEntry).join(Slot).filter(Slot.created_by == current_user.id).count()

    # User's submitted entries
    user_submitted = db.query(SlotEntry).join(Slot).filter(
        Slot.created_by == current_user.id,
        SlotEntry.is_submitted == True
    ).count()

    # Total thread count from all submitted entries
    total_threads = db.query(func.sum(SlotEntry.final_count)).join(Slot).filter(
        Slot.created_by == current_user.id,
        SlotEntry.is_submitted == True
    ).scalar() or 0

    # Recent activity for this user
    recent_logs = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id
    ).order_by(ActivityLog.timestamp.desc()).limit(10).all()

    recent_activity = []
    for log in recent_logs:
        slot = db.query(Slot).filter(Slot.id == log.slot_id).first() if log.slot_id else None
        recent_activity.append({
            "slot": slot.name if slot else None,
            "action": log.action,
            "timestamp": log.timestamp.isoformat(),
            "details": log.details
        })

    result = {
        "total_slots": user_slots,
        "total_entries": user_entries,
        "submitted_entries": user_submitted,
        "total_threads": total_threads,
        "recent_activity": recent_activity
    }
    
    # Cache for 30 seconds
    cache_set(cache_key, result, ex=30)
    return result

@app.get("/api/admin/model-feedback")
async def get_model_feedback(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get entries where users made corrections (for model training)"""
    # Get entries where user edited the count or colors
    corrected_entries = db.query(SlotEntry).filter(
        SlotEntry.was_edited_by_user == True
    ).order_by(SlotEntry.updated_at.desc()).all()

    result = []
    for entry in corrected_entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        slot = db.query(Slot).filter(Slot.id == entry.slot_id).first()

        # Calculate differences
        count_diff = entry.final_count - entry.detected_count
        accuracy = (min(entry.detected_count, entry.final_count) / max(entry.detected_count, entry.final_count) * 100) if entry.detected_count > 0 else 0

        result.append({
            "id": entry.id,
            "slot_name": slot.name if slot else "Unknown",
            "user": user.username if user else "Unknown",
            "image_path": entry.image_path,
            "annotated_path": entry.annotated_path,
            "ai_detected": {
                "count": entry.detected_count,
                "colors": entry.detected_colors
            },
            "user_corrected": {
                "count": entry.final_count,
                "colors": entry.final_colors
            },
            "difference": {
                "count": count_diff,
                "accuracy_percent": round(accuracy, 2)
            },
            "created_at": entry.created_at.isoformat() + 'Z' if entry.created_at else None,
            "updated_at": entry.updated_at.isoformat() + 'Z' if entry.updated_at else None,
            "is_submitted": entry.is_submitted
        })

    return {
        "total_corrections": len(result),
        "entries": result
    }

# ============ SLOT ENDPOINTS ============
@app.get("/api/slots")
async def get_slots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    slots = db.query(Slot).order_by(Slot.created_at.desc()).all()
    result = []
    for slot in slots:
        entry_count = db.query(SlotEntry).filter(SlotEntry.slot_id == slot.id).count()
        latest_entry = db.query(SlotEntry).filter(SlotEntry.slot_id == slot.id).order_by(SlotEntry.created_at.desc()).first()
        creator = db.query(User).filter(User.id == slot.created_by).first()
        
        result.append({
            "id": slot.id,
            "name": slot.name,
            "description": slot.description,
            "created_at": slot.created_at.isoformat(),
            "created_by": creator.username if creator else "Unknown",
            "entry_count": entry_count,
            "latest_count": latest_entry.final_count if latest_entry else 0,
            "latest_update": latest_entry.updated_at.isoformat() if latest_entry else None
        })
    return result

@app.post("/api/slots")
async def create_slot(
    slot_data: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Slot).filter(Slot.name == slot_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slot name already exists")
    
    slot = Slot(
        name=slot_data.name,
        description=slot_data.description,
        created_by=current_user.id
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        slot_id=slot.id,
        action="create_slot",
        details={"slot_name": slot.name}
    )
    db.add(log)
    db.commit()
    
    return {"id": slot.id, "name": slot.name}

@app.get("/api/slots/{slot_id}")
async def get_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    entries = db.query(SlotEntry).filter(SlotEntry.slot_id == slot_id).order_by(SlotEntry.created_at.desc()).all()
    creator = db.query(User).filter(User.id == slot.created_by).first()
    
    entries_data = []
    for entry in entries:
        entry_user = db.query(User).filter(User.id == entry.user_id).first()
        
        # Get last edit info
        last_edit = db.query(EntryEditHistory).filter(
            EntryEditHistory.entry_id == entry.id
        ).order_by(EntryEditHistory.timestamp.desc()).first()
        
        last_edited_by = None
        last_edited_at = None
        if last_edit:
            editor = db.query(User).filter(User.id == last_edit.user_id).first()
            last_edited_by = editor.username if editor else None
            last_edited_at = last_edit.timestamp.isoformat()
        
        # Get edit count
        edit_count = db.query(EntryEditHistory).filter(EntryEditHistory.entry_id == entry.id).count()
        
        entries_data.append({
            "id": entry.id,
            "filename": entry.filename,
            "image_url": f"/uploads/{entry.filename}",
            "annotated_url": f"/uploads/annotated/annotated_{entry.filename}" if entry.annotated_path else None,
            "detected_count": entry.detected_count,
            "final_count": entry.final_count,
            "detected_colors": entry.detected_colors,
            "final_colors": entry.final_colors,
            "processing_time": entry.processing_time,
            "is_submitted": entry.is_submitted,
            "wrongly_marked": entry.wrongly_marked or 0,
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat(),
            "submitted_at": entry.submitted_at.isoformat() if entry.submitted_at else None,
            "user": entry_user.username if entry_user else "Unknown",
            "last_edited_by": last_edited_by,
            "last_edited_at": last_edited_at,
            "edit_count": edit_count
        })
    
    return {
        "id": slot.id,
        "name": slot.name,
        "description": slot.description,
        "created_at": slot.created_at.isoformat(),
        "created_by": creator.username if creator else "Unknown",
        "entries": entries_data
    }

@app.delete("/api/slots/{slot_id}")
async def delete_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    # Delete related activity logs for this slot
    db.query(ActivityLog).filter(ActivityLog.slot_id == slot_id).delete()
    
    # Delete all entries and their related records
    entries = db.query(SlotEntry).filter(SlotEntry.slot_id == slot_id).all()
    for entry in entries:
        # Delete edit history for this entry
        db.query(EntryEditHistory).filter(EntryEditHistory.entry_id == entry.id).delete()
        
        # Delete files
        if entry.image_path and os.path.exists(entry.image_path):
            os.remove(entry.image_path)
        if entry.annotated_path and os.path.exists(entry.annotated_path):
            os.remove(entry.annotated_path)
        db.delete(entry)
    
    db.delete(slot)
    db.commit()
    
    return {"message": "Slot deleted successfully"}

@app.get("/api/slots/{slot_id}/csv")
async def export_slot_csv(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export slot entries as CSV"""
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    entries = db.query(SlotEntry).filter(SlotEntry.slot_id == slot_id).order_by(SlotEntry.created_at.desc()).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'Entry ID', 'Filename', 'AI Detected Count', 'Final Count', 
        'Colors', 'Status', 'Uploaded By', 'Created At', 'Updated At', 
        'Last Edited By', 'Processing Time (s)'
    ])
    
    for entry in entries:
        entry_user = db.query(User).filter(User.id == entry.user_id).first()
        
        # Get last editor from edit history
        last_edit = db.query(EntryEditHistory).filter(
            EntryEditHistory.entry_id == entry.id
        ).order_by(EntryEditHistory.timestamp.desc()).first()
        last_editor = None
        if last_edit:
            editor = db.query(User).filter(User.id == last_edit.user_id).first()
            last_editor = editor.username if editor else None
        
        # Format colors
        colors_str = ', '.join([f"{color}: {count}" for color, count in (entry.final_colors or {}).items()])
        
        writer.writerow([
            entry.id,
            entry.filename,
            entry.detected_count,
            entry.final_count,
            colors_str,
            'Submitted' if entry.is_submitted else 'Pending',
            entry_user.username if entry_user else 'Unknown',
            entry.created_at.strftime('%Y-%m-%d %H:%M:%S') if entry.created_at else '',
            entry.updated_at.strftime('%Y-%m-%d %H:%M:%S') if entry.updated_at else '',
            last_editor or entry_user.username if entry_user else 'Unknown',
            entry.processing_time
        ])
    
    output.seek(0)
    
    filename = f"{slot.name.replace(' ', '_')}_entries_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/slots/{slot_id}/edit-history")
async def get_slot_edit_history(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get edit history for all entries in a slot"""
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    # Get all entry IDs for this slot
    entry_ids = [e.id for e in db.query(SlotEntry).filter(SlotEntry.slot_id == slot_id).all()]
    
    # Get edit history for all entries
    history = db.query(EntryEditHistory).filter(
        EntryEditHistory.entry_id.in_(entry_ids)
    ).order_by(EntryEditHistory.timestamp.desc()).all()
    
    result = []
    for h in history:
        user = db.query(User).filter(User.id == h.user_id).first()
        entry = db.query(SlotEntry).filter(SlotEntry.id == h.entry_id).first()
        result.append({
            "id": h.id,
            "entry_id": h.entry_id,
            "entry_filename": entry.filename if entry else None,
            "user": user.username if user else "Unknown",
            "field_changed": h.field_changed,
            "old_value": h.old_value,
            "new_value": h.new_value,
            "timestamp": h.timestamp.isoformat()
        })
    
    return result

@app.get("/api/entries/{entry_id}/edit-history")
async def get_entry_edit_history(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get edit history for a specific entry"""
    entry = db.query(SlotEntry).filter(SlotEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    history = db.query(EntryEditHistory).filter(
        EntryEditHistory.entry_id == entry_id
    ).order_by(EntryEditHistory.timestamp.desc()).all()
    
    result = []
    for h in history:
        user = db.query(User).filter(User.id == h.user_id).first()
        result.append({
            "id": h.id,
            "user": user.username if user else "Unknown",
            "field_changed": h.field_changed,
            "old_value": h.old_value,
            "new_value": h.new_value,
            "timestamp": h.timestamp.isoformat()
        })
    
    return result


# ============ ENTRY ENDPOINTS ============
@app.post("/api/slots/{slot_id}/entries")
async def create_entry(
    slot_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload image and analyze thread rolls"""
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Analyze image
    start_time = time.time()
    result = detector.analyze_image(file_path)
    processing_time = time.time() - start_time
    
    # Create annotated image
    annotated_filename = f"annotated_{filename}"
    annotated_path = os.path.join(ANNOTATED_DIR, annotated_filename)
    
    if result.get('detections'):
        detector.create_annotated_image(file_path, detections=result['detections'], output_path=annotated_path)
    elif result.get('detected_circles'):
        detector.create_annotated_image(file_path, circles=result['detected_circles'], output_path=annotated_path)
    else:
        shutil.copy(file_path, annotated_path)
    
    # Create entry
    entry = SlotEntry(
        slot_id=slot_id,
        user_id=current_user.id,
        filename=filename,
        image_path=file_path,
        annotated_path=annotated_path,
        detected_count=result['total_threads'],
        final_count=result['total_threads'],
        detected_colors=result['color_breakdown'],
        final_colors=result['color_breakdown'],
        processing_time=round(processing_time, 2),
        detection_method=result.get('detection_method', 'Unknown')
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        slot_id=slot_id,
        entry_id=entry.id,
        action="upload_image",
        details={"filename": filename, "detected_count": result['total_threads']}
    )
    db.add(log)
    db.commit()
    
    return {
        "id": entry.id,
        "filename": filename,
        "image_url": f"/uploads/{filename}",
        "annotated_url": f"/uploads/annotated/{annotated_filename}",
        "detected_count": entry.detected_count,
        "final_count": entry.final_count,
        "detected_colors": entry.detected_colors,
        "final_colors": entry.final_colors,
        "processing_time": entry.processing_time
    }

@app.put("/api/entries/{entry_id}")
async def update_entry(
    entry_id: int,
    update_data: EntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update entry count and colors"""
    entry = db.query(SlotEntry).filter(SlotEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    changes = {}
    
    # Track count changes with edit history
    if update_data.final_count is not None and update_data.final_count != entry.final_count:
        changes["count"] = {"from": entry.final_count, "to": update_data.final_count}
        
        # Record edit history
        edit_history = EntryEditHistory(
            entry_id=entry.id,
            user_id=current_user.id,
            field_changed="count",
            old_value=entry.final_count,
            new_value=update_data.final_count
        )
        db.add(edit_history)
        
        entry.final_count = update_data.final_count

    # Track color changes with edit history
    if update_data.final_colors is not None and update_data.final_colors != entry.final_colors:
        changes["colors"] = {"from": entry.final_colors, "to": update_data.final_colors}
        
        # Record edit history
        edit_history = EntryEditHistory(
            entry_id=entry.id,
            user_id=current_user.id,
            field_changed="colors",
            old_value=entry.final_colors,
            new_value=update_data.final_colors
        )
        db.add(edit_history)
        
        entry.final_colors = update_data.final_colors

    # Track wrongly marked feedback
    if update_data.wrongly_marked is not None:
        if update_data.wrongly_marked != entry.wrongly_marked:
            changes["wrongly_marked"] = {"from": entry.wrongly_marked, "to": update_data.wrongly_marked}
            
            # Record edit history
            edit_history = EntryEditHistory(
                entry_id=entry.id,
                user_id=current_user.id,
                field_changed="wrongly_marked",
                old_value=entry.wrongly_marked,
                new_value=update_data.wrongly_marked
            )
            db.add(edit_history)
        
        entry.wrongly_marked = update_data.wrongly_marked

    # Check if user made corrections vs AI detection
    count_changed = entry.final_count != entry.detected_count
    colors_changed = entry.final_colors != entry.detected_colors

    if count_changed or colors_changed:
        entry.was_edited_by_user = True

    entry.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        slot_id=entry.slot_id,
        entry_id=entry.id,
        action="edit_entry",
        details=changes
    )
    db.add(log)
    db.commit()
    
    return {"message": "Entry updated successfully"}

@app.post("/api/entries/{entry_id}/submit")
async def submit_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit entry as final"""
    entry = db.query(SlotEntry).filter(SlotEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry.is_submitted = True
    entry.submitted_at = datetime.now(timezone.utc)
    db.commit()
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        slot_id=entry.slot_id,
        entry_id=entry.id,
        action="submit_entry",
        details={"final_count": entry.final_count, "final_colors": entry.final_colors}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Entry submitted successfully"}

@app.delete("/api/entries/{entry_id}")
async def delete_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an entry"""
    entry = db.query(SlotEntry).filter(SlotEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Delete related records first (foreign key constraints)
    db.query(ActivityLog).filter(ActivityLog.entry_id == entry_id).delete()
    db.query(EntryEditHistory).filter(EntryEditHistory.entry_id == entry_id).delete()
    
    # Delete files
    if entry.image_path and os.path.exists(entry.image_path):
        os.remove(entry.image_path)
    if entry.annotated_path and os.path.exists(entry.annotated_path):
        os.remove(entry.annotated_path)
    
    db.delete(entry)
    db.commit()
    
    return {"message": "Entry deleted successfully"}

# ============ DETECTION/BOUNDING BOX ENDPOINTS ============
@app.get("/api/entries/{entry_id}/detections")
async def get_entry_detections(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bounding box detections for an entry"""
    entry = db.query(SlotEntry).filter(SlotEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    detections = db.query(Detection).filter(Detection.entry_id == entry_id).all()
    
    return {
        "entry_id": entry_id,
        "image_url": f"/uploads/{entry.filename}",
        "detections": [
            {
                "id": d.id,
                "x": d.x,
                "y": d.y,
                "width": d.width,
                "height": d.height,
                "label": d.label,
                "color": d.color,
                "confidence": d.confidence,
                "is_ai_detected": d.is_ai_detected,
                "is_corrected": d.is_corrected
            }
            for d in detections
        ]
    }

@app.post("/api/save-corrections")
async def save_corrections(
    request: SaveCorrectionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save corrected bounding boxes - preserves original AI detections for model training
    Tracks: deletions, additions, moves, and resizes
    """
    entry = db.query(SlotEntry).filter(SlotEntry.id == request.entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Get existing AI detections (not previously deleted)
    ai_detections = db.query(Detection).filter(
        Detection.entry_id == request.entry_id,
        Detection.is_ai_detected == True,
        Detection.is_deleted == False
    ).all()

    # Helper function to find matching box (within 5% tolerance)
    def find_matching_ai_box(corrected_box, ai_boxes, tolerance=5.0):
        for ai_box in ai_boxes:
            dx = abs(ai_box.x - corrected_box.x)
            dy = abs(ai_box.y - corrected_box.y)
            dw = abs(ai_box.width - corrected_box.width)
            dh = abs(ai_box.height - corrected_box.height)

            # If box is within tolerance, consider it a match/modification
            if dx < tolerance and dy < tolerance and dw < tolerance and dh < tolerance:
                return ai_box
        return None

    correction_timestamp = datetime.now(timezone.utc)
    matched_ai_ids = set()
    corrections_stats = {
        "deleted": 0,
        "added": 0,
        "moved": 0,
        "resized": 0,
        "unchanged": 0
    }

    # Process corrected boxes
    for corrected_box in request.corrected_boxes:
        matched_ai = find_matching_ai_box(corrected_box, ai_detections)

        if matched_ai:
            # Box matches an AI detection - mark as matched
            matched_ai_ids.add(matched_ai.id)

            # Check if position or size changed significantly
            moved = (abs(matched_ai.x - corrected_box.x) > 1.0 or
                    abs(matched_ai.y - corrected_box.y) > 1.0)
            resized = (abs(matched_ai.width - corrected_box.width) > 1.0 or
                      abs(matched_ai.height - corrected_box.height) > 1.0)

            if moved or resized:
                # Update AI detection with new coordinates, but keep original
                matched_ai.original_x = matched_ai.x
                matched_ai.original_y = matched_ai.y
                matched_ai.original_width = matched_ai.width
                matched_ai.original_height = matched_ai.height
                matched_ai.x = corrected_box.x
                matched_ai.y = corrected_box.y
                matched_ai.width = corrected_box.width
                matched_ai.height = corrected_box.height
                matched_ai.is_corrected = True
                matched_ai.corrected_by_user_id = current_user.id
                matched_ai.corrected_at = correction_timestamp

                if moved and resized:
                    matched_ai.correction_type = "moved_resized"
                    corrections_stats["moved"] += 1
                    corrections_stats["resized"] += 1
                elif moved:
                    matched_ai.correction_type = "moved"
                    corrections_stats["moved"] += 1
                else:
                    matched_ai.correction_type = "resized"
                    corrections_stats["resized"] += 1
            else:
                # Box unchanged
                matched_ai.correction_type = "unchanged"
                corrections_stats["unchanged"] += 1
        else:
            # New box added by user
            new_detection = Detection(
                entry_id=request.entry_id,
                x=corrected_box.x,
                y=corrected_box.y,
                width=corrected_box.width,
                height=corrected_box.height,
                label=corrected_box.label,
                color=corrected_box.color,
                is_ai_detected=False,
                is_corrected=True,
                correction_type="added",
                corrected_by_user_id=current_user.id,
                corrected_at=correction_timestamp
            )
            db.add(new_detection)
            corrections_stats["added"] += 1

    # Mark unmatched AI detections as deleted
    for ai_detection in ai_detections:
        if ai_detection.id not in matched_ai_ids:
            ai_detection.is_deleted = True
            ai_detection.is_corrected = True
            ai_detection.correction_type = "deleted"
            ai_detection.corrected_by_user_id = current_user.id
            ai_detection.corrected_at = correction_timestamp
            corrections_stats["deleted"] += 1

    # Update entry count and mark as edited
    entry.final_count = len(request.corrected_boxes)
    entry.was_edited_by_user = True
    entry.updated_at = correction_timestamp

    db.commit()

    # Log activity with detailed statistics
    log = ActivityLog(
        user_id=current_user.id,
        slot_id=entry.slot_id,
        entry_id=entry.id,
        action="correct_detections",
        details={
            "final_box_count": len(request.corrected_boxes),
            "original_ai_count": len(ai_detections),
            "corrections": corrections_stats
        }
    )
    db.add(log)
    db.commit()

    return {
        "message": "Corrections saved successfully",
        "entry_id": request.entry_id,
        "detection_count": len(request.corrected_boxes),
        "corrections": corrections_stats
    }

@app.post("/api/entries/{entry_id}/init-detections")
async def init_detections_from_circles(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize detections from the detected_circles stored in entry (for existing entries)"""
    entry = db.query(SlotEntry).filter(SlotEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Check if detections already exist
    existing = db.query(Detection).filter(Detection.entry_id == entry_id).count()
    if existing > 0:
        return {"message": "Detections already exist", "count": existing}
    
    # Re-analyze the image to get detections
    if entry.image_path and os.path.exists(entry.image_path):
        result = detector.analyze_image(entry.image_path)
        circles = result.get('detected_circles', [])
        
        # Get image dimensions for percentage conversion
        import cv2
        img = cv2.imread(entry.image_path)
        if img is not None:
            img_height, img_width = img.shape[:2]
            
            for circle in circles:
                # Handle both list and dict formats
                if isinstance(circle, dict):
                    cx = circle.get('x', circle.get('cx', 0))
                    cy = circle.get('y', circle.get('cy', 0))
                    r = circle.get('r', circle.get('radius', 20))
                elif isinstance(circle, (list, tuple)) and len(circle) >= 3:
                    cx, cy, r = circle[0], circle[1], circle[2]
                else:
                    continue
                
                # Skip invalid circles
                if r <= 0 or cx <= 0 or cy <= 0:
                    continue
                
                # Convert to percentage-based bounding box
                x_pct = ((cx - r) / img_width) * 100
                y_pct = ((cy - r) / img_height) * 100
                w_pct = (2 * r / img_width) * 100
                h_pct = (2 * r / img_height) * 100
                
                # Clamp values and ensure minimum size
                x_pct = max(0, min(95, x_pct))
                y_pct = max(0, min(95, y_pct))
                w_pct = max(2, min(100 - x_pct, w_pct))
                h_pct = max(2, min(100 - y_pct, h_pct))
                
                # Skip if still too small
                if w_pct < 1 or h_pct < 1:
                    continue
                
                detection = Detection(
                    entry_id=entry_id,
                    x=x_pct,
                    y=y_pct,
                    width=w_pct,
                    height=h_pct,
                    label="Thread Roll",
                    is_ai_detected=True,
                    is_corrected=False
                )
                db.add(detection)
            
            db.commit()
            return {"message": "Detections initialized", "count": len(circles)}
    
    return {"message": "Could not initialize detections", "count": 0}

# ============ LEGACY ENDPOINTS (for backward compatibility) ============
@app.get("/")
async def root():
    return {
        "message": "Thread Roll Counter API",
        "version": "2.0.0",
        "endpoints": {
            "login": "POST /api/auth/login",
            "slots": "GET /api/slots",
            "create_slot": "POST /api/slots",
            "upload": "POST /api/slots/{slot_id}/entries"
        }
    }

@app.post("/api/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Legacy analyze endpoint"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    start_time = time.time()
    result = detector.analyze_image(file_path)
    processing_time = time.time() - start_time
    
    annotated_filename = f"annotated_{filename}"
    annotated_path = os.path.join(ANNOTATED_DIR, annotated_filename)
    
    if result.get('detections'):
        detector.create_annotated_image(file_path, detections=result['detections'], output_path=annotated_path)
    elif result.get('detected_circles'):
        detector.create_annotated_image(file_path, circles=result['detected_circles'], output_path=annotated_path)
    else:
        shutil.copy(file_path, annotated_path)
    
    analysis = Analysis(
        filename=filename,
        total_threads=result['total_threads'],
        color_breakdown=result['color_breakdown'],
        processing_time=processing_time,
        image_path=file_path,
        thumbnail_path=annotated_path
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    
    return {
        "id": analysis.id,
        "filename": filename,
        "total_threads": result['total_threads'],
        "color_breakdown": result['color_breakdown'],
        "processing_time": round(processing_time, 2),
        "upload_time": analysis.upload_time.isoformat(),
        "image_url": f"/uploads/{filename}",
        "annotated_url": f"/uploads/annotated/{annotated_filename}"
    }

@app.get("/api/history")
async def get_history(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    analyses = db.query(Analysis).order_by(Analysis.upload_time.desc()).offset(offset).limit(limit).all()
    return {
        "total": db.query(Analysis).count(),
        "results": [{
            "id": a.id,
            "filename": a.filename,
            "total_threads": a.total_threads,
            "color_breakdown": a.color_breakdown,
            "processing_time": a.processing_time,
            "upload_time": a.upload_time.isoformat(),
            "image_url": f"/uploads/{a.filename}",
            "annotated_url": f"/uploads/annotated/annotated_{a.filename}"
        } for a in analyses]
    }

@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "id": analysis.id,
        "filename": analysis.filename,
        "total_threads": analysis.total_threads,
        "color_breakdown": analysis.color_breakdown,
        "processing_time": analysis.processing_time,
        "upload_time": analysis.upload_time.isoformat(),
        "image_url": f"/uploads/{analysis.filename}",
        "annotated_url": f"/uploads/annotated/annotated_{analysis.filename}"
    }

@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_analyses = db.query(Analysis).count()
    if total_analyses == 0:
        return {"total_analyses": 0, "total_threads_counted": 0, "average_threads_per_rack": 0, "most_common_color": None}
    
    analyses = db.query(Analysis).all()
    total_threads = sum(a.total_threads for a in analyses)
    color_totals = {}
    for a in analyses:
        for color, count in a.color_breakdown.items():
            color_totals[color] = color_totals.get(color, 0) + count
    
    most_common_color = max(color_totals.items(), key=lambda x: x[1])[0] if color_totals else None
    
    return {
        "total_analyses": total_analyses,
        "total_threads_counted": total_threads,
        "average_threads_per_rack": round(total_threads / total_analyses, 2),
        "most_common_color": most_common_color,
        "color_distribution": color_totals
    }

# ============ MODEL TRAINING & CORRECTION STATISTICS ENDPOINTS ============

@app.get("/api/admin/correction-statistics")
async def get_correction_statistics(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics about user corrections for model improvement analysis
    Admin only endpoint
    """
    # Total entries with corrections
    corrected_entries_count = db.query(SlotEntry).filter(
        SlotEntry.was_edited_by_user == True
    ).count()

    # Count detections by correction type
    correction_stats = db.query(
        Detection.correction_type,
        func.count(Detection.id)
    ).filter(
        Detection.correction_type.isnot(None)
    ).group_by(Detection.correction_type).all()

    correction_breakdown = {stat[0]: stat[1] for stat in correction_stats}

    # Get AI accuracy statistics
    total_ai_detections = db.query(Detection).filter(
        Detection.is_ai_detected == True
    ).count()

    deleted_ai_detections = db.query(Detection).filter(
        Detection.is_ai_detected == True,
        Detection.is_deleted == True
    ).count()

    user_added_detections = db.query(Detection).filter(
        Detection.is_ai_detected == False
    ).count()

    # Calculate accuracy percentage
    if total_ai_detections > 0:
        accuracy = ((total_ai_detections - deleted_ai_detections) / total_ai_detections) * 100
    else:
        accuracy = 0

    # Get most active correctors
    top_correctors = db.query(
        User.username,
        func.count(Detection.id).label('correction_count')
    ).join(
        Detection, Detection.corrected_by_user_id == User.id
    ).group_by(User.username).order_by(
        func.count(Detection.id).desc()
    ).limit(5).all()

    # Recent corrections activity
    recent_corrections = db.query(
        func.date(Detection.corrected_at).label('date'),
        func.count(Detection.id).label('count')
    ).filter(
        Detection.corrected_at.isnot(None)
    ).group_by(
        func.date(Detection.corrected_at)
    ).order_by(
        func.date(Detection.corrected_at).desc()
    ).limit(30).all()

    return {
        "summary": {
            "total_entries_corrected": corrected_entries_count,
            "total_ai_detections": total_ai_detections,
            "deleted_by_users": deleted_ai_detections,
            "added_by_users": user_added_detections,
            "ai_accuracy_percent": round(accuracy, 2)
        },
        "correction_breakdown": correction_breakdown,
        "top_correctors": [
            {"username": c[0], "corrections": c[1]} for c in top_correctors
        ],
        "recent_activity": [
            {"date": str(r[0]), "corrections": r[1]} for r in recent_corrections
        ]
    }

@app.get("/api/admin/training-data/export")
async def export_training_data(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    format: str = "yolo"  # yolo, coco, or json
):
    """
    Export corrected bounding box data for model retraining
    Formats: 'yolo', 'coco', or 'json'
    Admin only endpoint
    """
    # Get all entries with corrections
    entries = db.query(SlotEntry).filter(
        SlotEntry.was_edited_by_user == True
    ).all()

    training_data = []

    for entry in entries:
        # Get all detections (both AI and user-corrected)
        detections = db.query(Detection).filter(
            Detection.entry_id == entry.id
        ).all()

        # Separate AI and corrected detections
        ai_boxes = []
        corrected_boxes = []

        for det in detections:
            box_data = {
                "x": det.x,
                "y": det.y,
                "width": det.width,
                "height": det.height,
                "label": det.label,
                "confidence": det.confidence
            }

            if det.is_ai_detected and not det.is_deleted:
                # AI detection that was kept/modified
                if det.is_corrected and det.original_x is not None:
                    # Box was moved/resized - include both original and corrected
                    ai_boxes.append({
                        **box_data,
                        "original": True,
                        "x": det.original_x,
                        "y": det.original_y,
                        "width": det.original_width,
                        "height": det.original_height
                    })
                    corrected_boxes.append({**box_data, "correction_type": det.correction_type})
                else:
                    corrected_boxes.append({**box_data, "correction_type": "unchanged"})
            elif det.is_ai_detected and det.is_deleted:
                # AI detection that was deleted - false positive
                ai_boxes.append({**box_data, "false_positive": True})
            elif not det.is_ai_detected:
                # User-added detection - missed by AI (false negative)
                corrected_boxes.append({**box_data, "correction_type": "added", "missed_by_ai": True})

        entry_data = {
            "entry_id": entry.id,
            "image_path": entry.image_path,
            "annotated_path": entry.annotated_path,
            "filename": entry.filename,
            "ai_detections": ai_boxes,
            "corrected_detections": corrected_boxes,
            "correction_stats": {
                "ai_count": entry.detected_count,
                "final_count": entry.final_count,
                "difference": entry.final_count - entry.detected_count
            }
        }
        training_data.append(entry_data)

    if format == "json":
        # Return as JSON
        output = io.BytesIO()
        output.write(json.dumps(training_data, indent=2).encode())
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=training_data.json"}
        )

    elif format == "yolo":
        # Create YOLO format annotations
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add dataset.yaml
            yaml_content = """# Thread Roll Detection Dataset
names: ['thread_roll']
nc: 1
train: ./images/train
val: ./images/val

# Dataset statistics
total_images: {}
total_annotations: {}
""".format(
                len(training_data),
                sum(len(e['corrected_detections']) for e in training_data)
            )
            zip_file.writestr("dataset.yaml", yaml_content)

            # Add annotations
            for entry in training_data:
                # YOLO format: <class_id> <x_center> <y_center> <width> <height> (normalized 0-1)
                yolo_annotations = []
                for box in entry['corrected_detections']:
                    x_center = (box['x'] + box['width'] / 2) / 100
                    y_center = (box['y'] + box['height'] / 2) / 100
                    width_norm = box['width'] / 100
                    height_norm = box['height'] / 100
                    yolo_annotations.append(f"0 {x_center} {y_center} {width_norm} {height_norm}")

                # Save annotation file
                annotation_filename = f"labels/{entry['filename'].rsplit('.', 1)[0]}.txt"
                zip_file.writestr(annotation_filename, "\n".join(yolo_annotations))

            # Add README
            readme = """# Thread Roll Detection Training Data

This dataset contains corrected bounding box annotations for thread roll detection.

## Format
- YOLO format annotations
- Class 0: thread_roll
- Coordinates are normalized (0-1)

## Usage
1. Extract this zip file
2. Copy your images to ./images/train/
3. Update paths in dataset.yaml
4. Train with: yolo train data=dataset.yaml model=yolov8n.pt

## Statistics
Total images: {}
Total annotations: {}
""".format(
                len(training_data),
                sum(len(e['corrected_detections']) for e in training_data)
            )
            zip_file.writestr("README.md", readme)

        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=training_data_yolo.zip"}
        )

    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'json' or 'yolo'")

@app.get("/api/entries/{entry_id}/correction-details")
async def get_entry_correction_details(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed correction information for a specific entry"""
    entry = db.query(SlotEntry).filter(SlotEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Get all detections
    detections = db.query(Detection).filter(Detection.entry_id == entry_id).all()

    correction_details = {
        "entry_id": entry_id,
        "was_corrected": entry.was_edited_by_user,
        "ai_count": entry.detected_count,
        "final_count": entry.final_count,
        "corrections": []
    }

    for det in detections:
        det_info = {
            "id": det.id,
            "current_position": {
                "x": det.x,
                "y": det.y,
                "width": det.width,
                "height": det.height
            },
            "is_ai_detected": det.is_ai_detected,
            "is_corrected": det.is_corrected,
            "is_deleted": det.is_deleted,
            "correction_type": det.correction_type,
            "corrected_by": det.corrected_by_user.username if det.corrected_by_user else None,
            "corrected_at": det.corrected_at.isoformat() if det.corrected_at else None
        }

        if det.original_x is not None:
            det_info["original_position"] = {
                "x": det.original_x,
                "y": det.original_y,
                "width": det.original_width,
                "height": det.original_height
            }

        correction_details["corrections"].append(det_info)

    return correction_details
