#!/bin/bash

echo "🧪 Starting EventCollect v1.2.0 Comprehensive Test Suite"
echo "=========================================================="

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s http://localhost:3000/api/leads > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start the server first:"
    echo "   cd server && npm run dev"
    exit 1
fi

# Run the comprehensive test script
echo ""
echo "🚀 Running comprehensive tests..."
cd server && node scripts/comprehensive-test.js
