#!/bin/bash

# ImageGen Startup Script
# This ensures the API key is properly loaded from .env

echo "🚀 Starting ImageGen..."

# Load API key from .env file
export OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d'=' -f2)

# Verify API key is loaded
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: No API key found in .env file"
    echo "Please add your OpenAI API key to the .env file"
    exit 1
fi

# Start the server
echo "✅ API key loaded successfully"
echo "🌐 Starting server on http://localhost:3000"
node server.js