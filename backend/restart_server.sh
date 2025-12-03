#!/bin/bash

# Thread Roll Counter - Server Restart Script

echo "🛑 Stopping existing servers..."
pkill -f "uvicorn.*app.main:app" 2>/dev/null
sleep 2

echo "🚀 Starting backend server..."
cd "$(dirname "$0")"
source venv/bin/activate

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

echo "✅ Backend server started (PID: $SERVER_PID)"
echo "📡 Server running at: http://localhost:8000"
echo "📖 API docs: http://localhost:8000/docs"
echo ""
echo "To view logs: tail -f nohup.out"
echo "To stop server: kill $SERVER_PID"
