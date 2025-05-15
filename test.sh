#!/bin/bash

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "Node.js is required but it's not installed."; exit 1; }

# Run tests from the root directory
echo "Running API comparison tests..."
node tests/test.js
