#!/bin/bash

echo "🚀 Starting static build for GitHub Pages..."

# Create temporary directory for API routes
mkdir -p temp-api-routes

# Move API routes to temporary location
echo "📁 Moving API routes temporarily..."
mv src/app/api temp-api-routes/

# Build the static site
echo "🔨 Building static site..."
NODE_ENV=production next build

# Move API routes back
echo "📁 Restoring API routes..."
mv temp-api-routes/api src/app/

echo "✅ Static build completed!"
