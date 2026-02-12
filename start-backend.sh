#!/bin/bash

echo "🚀 Starting Aaradhya Fashion Backend Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")/backend"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp ../.env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
fi

# Check if database directory exists
if [ ! -d "database" ]; then
    echo "📁 Creating database directory..."
    mkdir -p database
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if database exists, if not run migration
if [ ! -f "database/aaradhya.db" ]; then
    echo "🗄️  Database not found. Running migration..."
    npm run migrate
fi

echo ""
echo "✅ Backend server starting..."
echo "📡 API will be available at: http://localhost:3001/api"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
