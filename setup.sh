#!/bin/bash

echo "🚀 Setting up Thread Roll Counter Application..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo -e "${GREEN}✓ Python 3 found${NC}"

# Backend Setup
echo ""
echo -e "${BLUE}📦 Setting up Backend...${NC}"
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✓ Backend setup complete${NC}"

# Return to root directory
cd ..

# Frontend Setup
echo ""
echo -e "${BLUE}📦 Setting up Frontend...${NC}"
cd frontend

# Check if Node.js is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm is not installed. Please install Node.js 16 or higher."
    exit 1
fi

echo -e "${GREEN}✓ Node.js found${NC}"

# Install dependencies
echo "Installing npm dependencies..."
npm install

echo -e "${GREEN}✓ Frontend setup complete${NC}"

# Return to root directory
cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}To start the application:${NC}"
echo ""
echo -e "${BLUE}1. Start the backend:${NC}"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo -e "${BLUE}2. In a new terminal, start the frontend:${NC}"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo -e "${BLUE}3. Open your browser at:${NC}"
echo "   http://localhost:5173"
echo ""
echo -e "${YELLOW}Note: YOLOv11 model will be downloaded automatically on first use (~6MB)${NC}"
echo ""
