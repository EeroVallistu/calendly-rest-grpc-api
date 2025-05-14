#!/bin/bash

# Function to check if a command exists
command_exists() {
  command -v "$1" &> /dev/null
}

echo "Running API comparison tests..."

# Check if Node.js is installed
if ! command_exists node; then
  echo "Error: Node.js is not installed. Please install Node.js before running tests."
  exit 1
fi

# Check if the REST API is running
echo "Checking if REST API is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "Error: REST API is not running at http://localhost:3000"
  echo "Please start the REST API before running tests"
  exit 1
fi

# Check if the gRPC server is running
echo "Checking if gRPC server is running..."
# A simple check by trying to connect to the port
if ! (echo > /dev/tcp/localhost/50051) 2>/dev/null; then
  echo "Error: gRPC server is not running on port 50051"
  echo "Please start the gRPC server before running tests"
  exit 1
fi

# Run the tests
echo "Starting tests..."
node ../tests/test.js
exit $?
