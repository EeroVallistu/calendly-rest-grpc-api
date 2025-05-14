# test.ps1 - Script to run API comparison tests

# Stop on errors
$ErrorActionPreference = "Stop"

Write-Host "Running API comparison tests..."

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js before running tests."
    exit 1
}

# Check if the REST API is running
Write-Host "Checking if REST API is running..."
try {
    $null = Invoke-WebRequest -Uri "http://localhost:3000" -Method "HEAD" -TimeoutSec 5 -ErrorAction SilentlyContinue
} catch {
    Write-Error "REST API is not running at http://localhost:3000. Please start the REST API before running tests."
    exit 1
}

# Check if the gRPC server is running
Write-Host "Checking if gRPC server is running..."
$testConnection = Test-NetConnection -ComputerName localhost -Port 50051 -ErrorAction SilentlyContinue
if (-not $testConnection.TcpTestSucceeded) {
    Write-Error "gRPC server is not running on port 50051. Please start the gRPC server before running tests."
    exit 1
}

# Run the tests
Write-Host "Starting tests..."
node "$PSScriptRoot\test.js"
exit $LASTEXITCODE
