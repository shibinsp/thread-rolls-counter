# 🔒 Critical Security Fixes Required

## Immediate Action Required

Your application has **8 CRITICAL security vulnerabilities** that must be fixed before production deployment.

---

## Quick Fix Guide (Step-by-Step)

### 1️⃣ Fix Password Hashing (CRITICAL)

**Current Problem:** Using weak SHA-256 for passwords

```bash
# Install bcrypt
cd backend
source venv/bin/activate
pip install bcrypt==4.1.2
pip freeze > requirements.txt
```

**Update `backend/app/auth.py`:**

```python
# Replace lines 1-22 with:
import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

security = HTTPBearer()

# Simple token storage (in production, use Redis or JWT)
active_tokens = {}

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
```

**⚠️ WARNING:** This will invalidate all existing passwords. You'll need to:
1. Reset all user passwords
2. Notify users to reset passwords

---

### 2️⃣ Generate Secure SECRET_KEY (CRITICAL)

```bash
# Generate new secret key
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

**Update `backend/.env`:**

```bash
# Replace SECRET_KEY line with generated key
SECRET_KEY=<paste-your-generated-key-here>
DEBUG=False  # ALSO SET THIS TO FALSE!
```

**Example:**
```bash
SECRET_KEY=rQB7Hj9mK3pL8nXwYvZ2aR5tU6gF4sD1cV0bN7mQ9eW8rT3yU2iO1pL6kJ5hG4fD3sA
DEBUG=False
```

---

### 3️⃣ Remove Default Admin Password (CRITICAL)

**Update `backend/app/auth.py`:**

```python
# COMMENT OUT or REMOVE lines 84-95:
def create_default_admin(db: Session):
    """Create default admin user if not exists"""
    # admin = db.query(User).filter(User.username == "admin").first()
    # if not admin:
    #     admin = User(
    #         username="admin",
    #         password_hash=hash_password("admin123"),  # REMOVE THIS!
    #         role="admin"
    #     )
    #     db.add(admin)
    #     db.commit()
    #     print("✓ Default admin user created")
    pass  # Admins must be created manually
```

**Create admin manually via Python:**

```python
# backend/create_admin.py
from app.database import SessionLocal
from app.models import User
from app.auth import hash_password

db = SessionLocal()

# Prompt for secure password
import getpass
username = input("Admin username: ")
password = getpass.getpass("Admin password (min 12 chars): ")

if len(password) < 12:
    print("Password too short!")
    exit(1)

admin = User(
    username=username,
    password_hash=hash_password(password),
    role="admin"
)
db.add(admin)
db.commit()
print(f"✓ Admin user '{username}' created")
```

---

### 4️⃣ Fix CORS (CRITICAL)

**Update `backend/app/main.py` line 35:**

```python
# BEFORE (Insecure)
allow_origins=["*"],

# AFTER (Secure)
allow_origins=[
    "https://yourdomain.com",        # Your production domain
    "https://app.yourdomain.com",    # If using subdomain
    "http://localhost:5173",         # Keep for local development only
],
```

**For development, use:**
```python
import os
allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
```

Then in `.env`:
```bash
# Development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Production .env.production
CORS_ORIGINS=https://yourdomain.com
```

---

### 5️⃣ Add Rate Limiting (CRITICAL)

```bash
# Install slowapi
cd backend
source venv/bin/activate
pip install slowapi==0.1.9
pip freeze > requirements.txt
```

**Update `backend/app/main.py`:**

```python
# Add imports at top
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# After creating app
app = FastAPI(title="Thread Roll Counter API", version="2.0.0")

# Add rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add to login endpoint (around line 96)
@app.post("/api/auth/login")
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    # ... rest of code
```

---

### 6️⃣ Use Environment Variable for API URL (CRITICAL)

**Create `frontend/.env.production`:**

```bash
VITE_API_URL=https://api.yourdomain.com
```

**Update `frontend/src/services/api.js` line 1:**

```javascript
// BEFORE
const API_BASE_URL = 'http://localhost:8000';

// AFTER
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

**Build for production:**
```bash
cd frontend
npm run build
```

---

### 7️⃣ Move Tokens to Redis (CRITICAL)

**Update `backend/app/auth.py`:**

```python
from .redis_client import redis_client
import json

def create_token(user_id: int) -> str:
    """Create and store token in Redis"""
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)

    token_data = {
        "user_id": user_id,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat()
    }

    # Store in Redis with 24-hour expiration
    redis_client.setex(
        f"token:{token}",
        timedelta(hours=24),
        json.dumps(token_data)
    )

    return token

def validate_token(token: str) -> Optional[int]:
    """Validate token from Redis"""
    token_data_json = redis_client.get(f"token:{token}")

    if not token_data_json:
        return None

    token_data = json.loads(token_data_json)
    expires_at = datetime.fromisoformat(token_data["expires_at"])

    if datetime.now(timezone.utc) > expires_at:
        redis_client.delete(f"token:{token}")
        return None

    return token_data["user_id"]

def invalidate_token(token: str):
    """Invalidate token in Redis"""
    redis_client.delete(f"token:{token}")
```

---

### 8️⃣ Add Basic Logging (HIGH PRIORITY)

**Create `backend/app/logger.py`:**

```python
import logging
import sys
from pathlib import Path

# Create logs directory
Path("logs").mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("thread_counter")
```

**Use in `backend/app/main.py`:**

```python
from .logger import logger

# Log important events
@app.post("/api/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for user: {request.username}")
    # ... rest of code

    if user and verify_password(request.password, user.password_hash):
        logger.info(f"Successful login: {user.username}")
    else:
        logger.warning(f"Failed login attempt: {request.username}")
```

---

## Testing After Fixes

```bash
# 1. Run database migrations (if password hashing changed)
cd backend
source venv/bin/activate
alembic upgrade head

# 2. Test backend
python3 -m pytest tests/

# 3. Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 4. Build frontend
cd ../frontend
npm run build

# 5. Test production build
npm run preview
```

---

## Verification Checklist

After applying fixes, verify:

- [ ] Passwords use bcrypt (check `auth.py`)
- [ ] SECRET_KEY is strong random value (check `.env`)
- [ ] DEBUG=False in production (check `.env`)
- [ ] No default admin password (check `auth.py`)
- [ ] CORS restricted to your domain (check `main.py`)
- [ ] Rate limiting active on /login (test with 6+ attempts)
- [ ] API URL uses environment variable (check `api.js`)
- [ ] Tokens stored in Redis (check `auth.py`)
- [ ] Logs being written to `logs/app.log`

---

## Additional Security Measures (Recommended)

### HTTPS Setup (Use Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/thread-counter
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend static files
    location / {
        root /var/www/thread-counter/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Uploads
    location /uploads {
        alias /var/www/thread-counter/backend/uploads;
    }
}
```

---

## Time Estimate

**Applying all critical fixes:** 2-4 hours
**Testing:** 1-2 hours
**SSL/Nginx setup:** 1-2 hours

**Total:** ~4-8 hours

---

## Support

If you encounter issues:
1. Check logs in `backend/logs/app.log`
2. Test each fix individually
3. Verify database migrations ran successfully
4. Ensure Redis is running (`redis-cli ping`)

---

## After Deployment

Monitor for:
- Failed login attempts (rate limiting working?)
- Server errors (logging working?)
- Performance issues (Redis caching working?)
- Security alerts (set up fail2ban)

Good luck! 🚀🔒
