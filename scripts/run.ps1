# run.ps1 - Script to run gRPC server

# Stop on errors
$ErrorActionPreference = "Stop"

# Determine script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Navigate to project root
Set-Location $ProjectRoot

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js before running this script."
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

# Generate TypeScript types from proto files
Write-Host "Generating code from Proto definitions..."
npm run proto:gen

# Set environment variables
$env:GRPC_PORT = 50051

# Start the gRPC server
Write-Host "Starting gRPC server on port $env:GRPC_PORT..."
node src/server.js
