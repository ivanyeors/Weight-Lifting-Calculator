#!/bin/bash

# Fitspo — Fitness Calculator - GitHub Pages Deployment Script

echo "🚀 Starting deployment to GitHub Pages..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the App directory."
    exit 1
fi

# Check if gh-pages is installed
if ! npm list gh-pages > /dev/null 2>&1; then
    echo "📦 Installing gh-pages..."
    npm install --save-dev gh-pages
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to GitHub Pages
echo "🚀 Deploying to GitHub Pages..."
npm run deploy

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your app should be available at:"
echo "   https://yourusername.github.io/Weight-Lifting-Calculator/"
echo ""
echo "📝 Don't forget to:"
echo "   1. Go to your GitHub repository"
echo "   2. Navigate to Settings → Pages"
echo "   3. Select 'Deploy from a branch'"
echo "   4. Choose the 'gh-pages' branch"
echo "   5. Click 'Save'"
echo ""
echo "⏳ It may take a few minutes for the changes to appear on GitHub Pages."
