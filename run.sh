#!/bin/bash

# Save the absolute path to the project root directory
PROJECT_ROOT="$(pwd)"

# Start the REST API server in background
echo "Starting REST API server..."
cd "$PROJECT_ROOT/calendly-clone-api" || { echo "Failed to change directory to calendly-clone-api"; exit 1; }
node server.js &
REST_PID=$!

# Give REST API time to start
sleep 2

# Go back to project root and start the gRPC server
echo "Starting gRPC server..."
cd "$PROJECT_ROOT" || { echo "Failed to change directory to project root"; exit 1; }
node src/server.js

# If gRPC server exits, kill the REST API server
kill $REST_PID
