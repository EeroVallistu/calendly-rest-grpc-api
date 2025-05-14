# Calendly Clone - gRPC Implementation

This project implements a gRPC version of the Calendly Clone API that was previously implemented as a REST API. Both APIs use the same database schema and provide identical functionality.

## Project Structure

```
/
├── proto/                  # Protocol Buffer definitions
│   └── calendly.proto      # Main proto file defining all services and messages
├── src/                    # Source code
│   ├── server.js           # gRPC server entry point
│   ├── db.js               # Database utilities
│   ├── middleware/         # Middleware functions
│   │   └── auth.js         # Authentication middleware
│   ├── services/           # Service implementations
│   │   ├── user-service.js
│   │   ├── session-service.js
│   │   ├── event-service.js
│   │   ├── schedule-service.js
│   │   └── appointment-service.js
│   └── utils/              # Utility functions
│       └── validators.js   # Input validation utilities
├── client/                 # Example client
│   └── example.js          # Example of how to use the gRPC client
├── scripts/                # Scripts for running the server
│   ├── run.sh              # Bash script to start the server (Linux/Mac)
│   └── run.ps1             # PowerShell script to start the server (Windows)
└── tests/                  # Tests to validate API functionality
    ├── test.js             # Test implementation comparing REST and gRPC APIs
    ├── test.sh             # Bash script to run tests (Linux/Mac)
    └── test.ps1            # PowerShell script to run tests (Windows)
```

## Requirements

- Node.js 14+ and npm
- The REST API server running on port 3000 (for comparison tests)

## Installation

Clone the repository and install dependencies:

```bash
cd <project_directory>
npm install
```

This will install all required dependencies, including:
- @grpc/grpc-js - gRPC implementation for Node.js
- @grpc/proto-loader - Proto file loader
- sqlite3 - SQLite database driver
- dotenv - Environment variable loader

## Running the Server

### On Windows:

```powershell
.\scripts\run.ps1
```

### On Linux/Mac:

```bash
chmod +x ./scripts/run.sh
./scripts/run.sh
```

The server will start on port 50051 by default. You can change the port by setting the `GRPC_PORT` environment variable.

## Testing

The testing script compares the functionality of the REST and gRPC implementations to ensure they are functionally equivalent. The tests will:

1. Create users in both APIs
2. Log in to get authentication tokens
3. Create events
4. Set up schedules
5. Create appointments
6. Update appointments
7. List appointments
8. Test logout functionality

### Prerequisites for Testing

- The REST API server must be running on port 3000
- The gRPC server must be running on port 50051

### Running Tests

### On Windows:

```powershell
.\tests\test.ps1
```

### On Linux/Mac:

```bash
chmod +x ./tests/test.sh
./tests/test.sh
```

## Example Client

An example client implementation is provided in `client/example.js`. You can run it to see how to interact with the gRPC server:

```bash
node client/example.js
```

This will:
1. Create a user
2. Log in with that user
3. Create an event
4. List all events
5. Create a schedule
6. Create an appointment
7. List all appointments
8. Update an appointment
9. Log out

## API Services

The gRPC API includes the following services:

1. **UserService** - User management
2. **SessionService** - Authentication
3. **EventService** - Event type management
4. **ScheduleService** - Schedule management
5. **AppointmentService** - Appointment booking and management

Each service corresponds to an endpoint in the REST API but uses Protocol Buffers and gRPC for communication.

## Error Handling

The gRPC implementation uses standard gRPC error codes to indicate various error conditions:

- INVALID_ARGUMENT (3) - For validation errors
- NOT_FOUND (5) - When a requested resource doesn't exist
- ALREADY_EXISTS (6) - For duplicate resources (e.g., email already exists)
- PERMISSION_DENIED (7) - When a user tries to access a resource they don't own
- UNAUTHENTICATED (16) - When authentication fails
- INTERNAL (13) - For database or server errors

Each error includes a descriptive message explaining the issue.
