#!/bin/bash

# Deploy script for GitHub Pages
echo "🚀 Starting deployment to GitHub Pages..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

# Deploy to gh-pages branch
echo "📤 Deploying to gh-pages branch..."
npx gh-pages -d out

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful! Your site should be available at:"
    echo "   https://[your-username].github.io/Weight-Lifting-Calculator/"
    echo ""
    echo "Note: It may take a few minutes for changes to appear."
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
