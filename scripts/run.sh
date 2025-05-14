#!/bin/bash

# Stop execution on error
set -e

# Determine the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Go to the project root directory
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js before running this script."
  exit 1
fi

# Make scripts executable if they're not already
chmod +x "$SCRIPT_DIR/tests/test.sh" 2>/dev/null || true

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Generate TypeScript types from proto files
echo "Generating code from Proto definitions..."
npm run proto:gen

# Set environment variables
export GRPC_PORT=50051

# Start the gRPC server
echo "Starting gRPC server on port $GRPC_PORT..."
node src/server.js
