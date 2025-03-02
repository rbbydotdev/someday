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

pushd packages/cli
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
popd
echo "CLI built successfully!"

rm -rf packages/cli/dist/google_apps_script/
mkdir -p packages/cli/dist/google_apps_script/

cp packages/backend/dist/* packages/cli/dist/google_apps_script/
cp packages/frontend/dist/* packages/cli/dist/google_apps_script/
mv packages/cli/dist/appsscript.json packages/cli/dist/google_apps_script/

echo "Build complete!"
