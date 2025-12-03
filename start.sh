#!/bin/bash

# Thread Roll Counter - Development Server Launcher
# This script starts both backend and frontend servers

echo "🚀 Starting Thread Roll Counter Application..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if setup has been run
if [ ! -d "backend/venv" ]; then
    echo -e "${RED}❌ Backend not set up. Please run ./setup.sh first${NC}"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${RED}❌ Frontend not set up. Please run ./setup.sh first${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${BLUE}📦 Starting Backend Server...${NC}"
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend running on http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check backend.log for details${NC}"
    exit 1
fi

# Start Frontend
echo -e "${BLUE}📦 Starting Frontend Server...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend running on http://localhost:1111${NC}"
else
    echo -e "${RED}❌ Frontend failed to start. Check frontend.log for details${NC}"
    kill $BACKEND_PID
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Application Started Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}🌐 Open your browser at:${NC}"
echo -e "   ${YELLOW}http://localhost:1111${NC}"
echo ""
echo -e "${BLUE}📚 API Documentation:${NC}"
echo -e "   ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo -e "   Backend: tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Keep script running
wait
