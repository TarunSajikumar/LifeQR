#!/bin/bash

echo "🚑 LifeQR - Quick Start Script"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Navigate to backend directory
cd backend || exit

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# MongoDB Connection (Update this!)
MONGO_URI=mongodb://localhost:27017/lifeqr

# JWT Secret (CHANGE THIS to a random string!)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Server Port
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:5000

# Environment
NODE_ENV=development
EOF
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Update MONGO_URI in .env file"
    echo ""
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if nc -z localhost 27017 2>/dev/null; then
    echo "✅ MongoDB is running on localhost:27017"
else
    echo "⚠️  MongoDB not detected on localhost:27017"
    echo ""
    echo "Options:"
    echo "1. Install and start MongoDB locally"
    echo "2. Use MongoDB Atlas (cloud database)"
    echo ""
    echo "For MongoDB Atlas:"
    echo "- Visit: https://www.mongodb.com/cloud/atlas"
    echo "- Create a free cluster"
    echo "- Update MONGO_URI in .env file"
    echo ""
fi

echo ""
echo "🚀 Starting LifeQR server..."
echo ""
echo "Server will be available at:"
echo "- Landing Page: http://localhost:5000"
echo "- Login: http://localhost:5000/lifeqr_login.html"
echo "- Signup: http://localhost:5000/lifeqr_signup.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
