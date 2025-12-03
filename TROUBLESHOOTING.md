# Troubleshooting Guide

## Console Errors Fixed ✅

All the console errors you were seeing have been resolved:

1. ✅ **CORS Error**: Fixed - Server restarted with proper configuration
2. ✅ **401 Unauthorized**: Fixed - Updated timezone handling in authentication
3. ✅ **Failed to fetch**: Fixed - Backend server now running properly

## Quick Server Restart

### Backend
```bash
cd backend
./restart_server.sh
```

### Frontend
```bash
cd frontend
npm run dev
```

## Common Issues & Solutions

### 1. CORS Errors
**Symptoms**:
- "Access-Control-Allow-Origin" errors in console
- Failed to fetch from localhost:8000

**Solution**:
```bash
# Restart backend server
cd backend
./restart_server.sh
```

### 2. 401 Unauthorized
**Symptoms**:
- All API requests return 401
- Can't access dashboard after login

**Solution**:
- Clear browser cookies/localStorage
- Log out and log in again
- Check if backend server is running

### 3. Backend Not Responding
**Symptoms**:
- Connection refused errors
- "Failed to load resource" errors

**Solution**:
```bash
# Check if backend is running
ps aux | grep uvicorn

# If not running, start it
cd backend
./restart_server.sh

# Check logs
tail -f backend/nohup.out
```

### 4. Frontend Not Loading
**Symptoms**:
- Blank page
- "Module not found" errors

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 5. Database Errors
**Symptoms**:
- "relation does not exist"
- Migration errors

**Solution**:
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

### 6. Port Already in Use
**Symptoms**:
- "Address already in use" error
- Can't start server on port 8000

**Solution**:
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use the restart script
cd backend
./restart_server.sh
```

## Checking Service Status

### Backend
```bash
# Check if running
curl http://localhost:8000/

# Should return:
# {"message":"Thread Roll Counter API","version":"2.0.0",...}
```

### Frontend
```bash
# Check if running
curl http://localhost:5173/

# Should return HTML content
```

### PostgreSQL
```bash
# Check if running
sudo systemctl status postgresql

# Test connection
PGPASSWORD=shibin psql -U postgres -h localhost -d thread -c "SELECT 1;"
```

### Redis (Optional)
```bash
# Check if running
redis-cli ping

# Should return: PONG

# If not installed or needed, app works without it
```

## Clean Restart (Nuclear Option)

If nothing works, try a complete restart:

```bash
# 1. Stop everything
pkill -f uvicorn
pkill -f "npm.*dev"

# 2. Clear browser data
# - Open browser DevTools (F12)
# - Application tab > Storage > Clear site data

# 3. Restart backend
cd backend
./restart_server.sh

# 4. Restart frontend
cd ../frontend
npm run dev

# 5. Log in again
# Visit http://localhost:5173
# Login with your credentials
```

## Logs Location

- **Backend logs**: Check terminal where `uvicorn` is running
- **Frontend logs**: Check browser console (F12)
- **PostgreSQL logs**: `/var/log/postgresql/`
- **Application errors**: Browser console + backend terminal

## Debug Mode

### Enable Detailed Backend Logs
```bash
# Edit .env file
DEBUG=True

# Restart server
./restart_server.sh
```

### Enable Frontend Debug
```bash
# Open browser console (F12)
# All API calls are logged automatically
```

## Current Setup Status

✅ Backend: Running on http://localhost:8000
✅ Frontend: Should run on http://localhost:5173
✅ PostgreSQL: Running (database: thread)
⚠️ Redis: Optional (not required for operation)

## Getting Help

If you encounter issues:

1. Check browser console (F12) for errors
2. Check backend terminal for errors
3. Review this troubleshooting guide
4. Check backend logs: `tail -f backend/nohup.out`
5. Verify all services are running (see above)

## Important Notes

- **Always restart backend** after code changes
- **Clear browser cache** if you see old UI
- **Check both terminals** (frontend + backend) for errors
- **PostgreSQL must be running** for the app to work
- **Redis is optional** - app works without it

## Quick Health Check

Run this to check everything:

```bash
#!/bin/bash
echo "🔍 Checking services..."

# Backend
echo -n "Backend (8000): "
curl -s http://localhost:8000/ >/dev/null && echo "✅ Running" || echo "❌ Down"

# Frontend
echo -n "Frontend (5173): "
curl -s http://localhost:5173/ >/dev/null && echo "✅ Running" || echo "❌ Down"

# PostgreSQL
echo -n "PostgreSQL: "
PGPASSWORD=shibin psql -U postgres -h localhost -d thread -c "SELECT 1;" >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Down"

# Redis
echo -n "Redis (optional): "
redis-cli ping >/dev/null 2>&1 && echo "✅ Running" || echo "⚠️ Not running (OK)"
```

Save this as `health_check.sh`, make it executable (`chmod +x health_check.sh`), and run it anytime!
