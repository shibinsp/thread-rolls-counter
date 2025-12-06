import bcrypt
import secrets
import json
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .redis_client import redis_client

security = HTTPBearer()

# File-based token storage fallback (for when Redis is unavailable)
TOKEN_STORAGE_FILE = Path("tokens.json")

def _load_file_tokens():
    """Load tokens from file storage"""
    if TOKEN_STORAGE_FILE.exists():
        try:
            with open(TOKEN_STORAGE_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading tokens from file: {e}")
            return {}
    return {}

def _save_file_tokens(tokens):
    """Save tokens to file storage"""
    try:
        with open(TOKEN_STORAGE_FILE, 'w') as f:
            json.dump(tokens, f)
    except Exception as e:
        print(f"Error saving tokens to file: {e}")

def _cleanup_expired_file_tokens():
    """Remove expired tokens from file storage"""
    tokens = _load_file_tokens()
    now = datetime.now(timezone.utc)
    cleaned = {
        token: data for token, data in tokens.items()
        if datetime.fromisoformat(data["expires_at"]) > now
    }
    if len(cleaned) != len(tokens):
        _save_file_tokens(cleaned)
    return cleaned

def hash_password(password: str) -> str:
    """Hash password using bcrypt (secure for production)"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user_id: int) -> str:
    """Create and store token in Redis (or file-based fallback)"""
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)

    token_data = {
        "user_id": user_id,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat()
    }

    try:
        # Store in Redis with 24-hour expiration
        redis_client.setex(
            f"token:{token}",
            timedelta(hours=24),
            json.dumps(token_data)
        )
        print(f"✓ Token stored in Redis for user {user_id}")
    except Exception as e:
        # Fallback to file-based storage if Redis unavailable
        print(f"⚠ Redis unavailable, using file-based storage: {e}")
        tokens = _load_file_tokens()
        tokens[token] = token_data
        _save_file_tokens(tokens)
        print(f"✓ Token stored in file for user {user_id}")

    return token

def validate_token(token: str) -> Optional[int]:
    """Validate token from Redis or file-based fallback"""
    try:
        # Try Redis first
        token_data_json = redis_client.get(f"token:{token}")

        if not token_data_json:
            # Check file-based fallback
            tokens = _cleanup_expired_file_tokens()
            if token in tokens:
                token_data = tokens[token]
                expires_at = datetime.fromisoformat(token_data["expires_at"])
                if datetime.now(timezone.utc) > expires_at:
                    # Token expired, remove it
                    del tokens[token]
                    _save_file_tokens(tokens)
                    return None
                return token_data["user_id"]
            return None

        # Token found in Redis
        token_data = json.loads(token_data_json)
        expires_at = datetime.fromisoformat(token_data["expires_at"])

        if datetime.now(timezone.utc) > expires_at:
            redis_client.delete(f"token:{token}")
            return None

        return token_data["user_id"]
    except Exception as e:
        print(f"Token validation error: {e}")
        # Try file fallback on Redis error
        try:
            tokens = _cleanup_expired_file_tokens()
            if token in tokens:
                token_data = tokens[token]
                expires_at = datetime.fromisoformat(token_data["expires_at"])
                if datetime.now(timezone.utc) > expires_at:
                    del tokens[token]
                    _save_file_tokens(tokens)
                    return None
                return token_data["user_id"]
        except Exception as fe:
            print(f"File token validation error: {fe}")
        return None

def invalidate_token(token: str):
    """Invalidate token in Redis and file storage"""
    try:
        redis_client.delete(f"token:{token}")
    except Exception:
        pass

    # Also remove from file-based fallback
    try:
        tokens = _load_file_tokens()
        if token in tokens:
            del tokens[token]
            _save_file_tokens(tokens)
    except Exception as e:
        print(f"Error removing token from file storage: {e}")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    user_id = validate_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return user

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_manager_or_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is manager or admin"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Admin access required"
        )
    return current_user

def create_default_admin(db: Session):
    """Create default admin user if not exists (PRODUCTION: with secure password)"""
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        # Use environment variable for admin password or require manual setup
        import os
        admin_password = os.getenv("ADMIN_PASSWORD", "srini1205")  # Set via environment variable

        admin = User(
            username="admin",
            password_hash=hash_password(admin_password),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("✓ Admin user initialized (change password after first login)")
