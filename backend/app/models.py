from sqlalchemy import Column, Integer, String, DateTime, JSON, Float, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

# Helper function for timezone-aware datetime
def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="user")  # "admin" or "user"
    created_at = Column(DateTime, default=utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    slot_entries = relationship("SlotEntry", back_populates="user")
    activity_logs = relationship("ActivityLog", back_populates="user")

class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    entries = relationship("SlotEntry", back_populates="slot", order_by="desc(SlotEntry.created_at)")

class SlotEntry(Base):
    __tablename__ = "slot_entries"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("slots.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Image data
    filename = Column(String)
    image_path = Column(String)
    annotated_path = Column(String, nullable=True)
    
    # Detection results
    detected_count = Column(Integer, default=0)
    final_count = Column(Integer, default=0)  # User-edited count
    detected_colors = Column(JSON, default={})  # Auto-detected colors
    final_colors = Column(JSON, default={})  # User-edited colors
    
    # Processing info
    processing_time = Column(Float, default=0)
    detection_method = Column(String, nullable=True)
    
    # Status
    is_submitted = Column(Boolean, default=False)
    was_edited_by_user = Column(Boolean, default=False)  # Track if user made corrections
    wrongly_marked = Column(Integer, default=0)  # User feedback: how many AI detections were wrong

    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    submitted_at = Column(DateTime, nullable=True)
    
    # Relationships
    slot = relationship("Slot", back_populates="entries")
    user = relationship("User", back_populates="slot_entries")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=True)
    entry_id = Column(Integer, ForeignKey("slot_entries.id"), nullable=True)
    
    action = Column(String)  # "create_slot", "upload_image", "edit_count", "edit_colors", "submit", etc.
    details = Column(JSON, nullable=True)  # Additional details about the action

    timestamp = Column(DateTime, default=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="activity_logs")

class EntryEditHistory(Base):
    """Track all edits made to slot entries"""
    __tablename__ = "entry_edit_history"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("slot_entries.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # What was changed
    field_changed = Column(String)  # "count", "colors", "submitted"
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    
    timestamp = Column(DateTime, default=utcnow)
    
    # Relationships
    entry = relationship("SlotEntry", backref="edit_history")
    user = relationship("User")

class Detection(Base):
    """Store individual bounding box detections for each entry"""
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("slot_entries.id"), index=True)

    # Bounding box coordinates (percentage 0-100)
    x = Column(Float)  # Left position as percentage
    y = Column(Float)  # Top position as percentage
    width = Column(Float)  # Width as percentage
    height = Column(Float)  # Height as percentage

    # Detection info
    label = Column(String, default="Thread Roll")
    confidence = Column(Float, nullable=True)  # AI confidence score
    color = Column(String, nullable=True)  # Detected color of this thread roll

    # Status
    is_ai_detected = Column(Boolean, default=True)  # True if AI detected, False if user added
    is_corrected = Column(Boolean, default=False)  # True if user modified this detection
    is_deleted = Column(Boolean, default=False)  # True if user deleted this AI detection

    # Original AI coordinates (for tracking changes)
    original_x = Column(Float, nullable=True)  # Original AI x position
    original_y = Column(Float, nullable=True)  # Original AI y position
    original_width = Column(Float, nullable=True)  # Original AI width
    original_height = Column(Float, nullable=True)  # Original AI height

    # Correction tracking
    correction_type = Column(String, nullable=True)  # "deleted", "added", "moved", "resized", "unchanged"
    corrected_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # User who made correction
    corrected_at = Column(DateTime, nullable=True)  # When correction was made

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    entry = relationship("SlotEntry", backref="detections")
    corrected_by_user = relationship("User", foreign_keys=[corrected_by_user_id])


# Keep old Analysis model for backward compatibility
class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    upload_time = Column(DateTime, default=utcnow)
    total_threads = Column(Integer)
    color_breakdown = Column(JSON)
    processing_time = Column(Float)
    image_path = Column(String)
    thumbnail_path = Column(String, nullable=True)
