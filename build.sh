#!/bin/bash
set -e

echo "Building backend..."
pushd packages/backend
#if node_modules doesn't exist, npm install
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
popd
echo "Backend built successfully!"
pushd packages/frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
popd
echo "Frontend built successfully!"
mkdir -p dist
rm -rf dist/*
cp packages/backend/dist/* dist/
cp packages/frontend/dist/* dist/

echo "Build complete!"
