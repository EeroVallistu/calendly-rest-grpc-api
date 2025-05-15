# Calendly Clone - gRPC Implementation

This project implements a gRPC version of the Calendly Clone API that was previously implemented as a REST API. Both APIs use the same database schema and provide identical functionality.

## Project Structure

```
/
├── run.sh                  # Bash script to start both REST and gRPC servers
├── run-client.sh           # Bash script to run the example client
├── test.sh                 # Bash script to run the tests
├── proto/                  # Protocol Buffer definitions
│   └── calendly.proto      # Main proto file defining all services and messages
├── src/                    # Source code
│   ├── server.js           # gRPC server entry point
│   ├── db.js               # Database utilities
│   ├── middleware/         # Middleware functions
│   │   └── auth.js         # Authentication middleware
│   ├── proto/              # Generated TypeScript definitions from proto files
│   │   └── calendlygrpc/   # Generated service definitions
│   │   └── google/         # Google protobuf definitions
│   ├── services/           # Service implementations
│   │   ├── user-service.js
│   │   ├── session-service.js
│   │   ├── event-service.js
│   │   ├── schedule-service.js
│   │   └── appointment-service.js
│   └── utils/              # Utility functions
│       └── validators.js   # Input validation utilities
├── client/                 # Client directory
│   └── client.js           # Example client implementation
├── calendly-clone-api/     # Original REST API implementation
│   ├── server.js           # REST API server
│   ├── db.js               # Database utilities for REST API
│   ├── routes/             # REST API routes
│   ├── middleware/         # REST API middleware 
│   └── docs/               # REST API documentation
└── tests/                  # Tests to validate API functionality
    └── test.js             # Test implementation comparing REST and gRPC APIs
```

## Requirements

- Node.js 14+ and npm (or bun)
- The project includes both the REST API and gRPC API implementations

## Installation

Clone the repository and install dependencies:

```bash
cd calendly-rest-gprc-api
npm install
# or if you prefer using bun
bun install
```

This will install all required dependencies, including:
- @grpc/grpc-js - gRPC implementation for Node.js
- @grpc/proto-loader - Proto file loader
- sqlite3 - SQLite database driver
- express - Web framework for REST API
- dotenv - Environment variable loader
- swagger-ui-express - Swagger UI for API documentation
- concurrently - Run multiple commands concurrently

## Running the Server

The project includes a script that starts both the REST API and gRPC servers:

```bash
# Using the shell script
chmod +x ./run.sh
./run.sh

# Or using npm
npm run start
```

This will:
1. Start the REST API server on port 3000
2. Start the gRPC server on port 50051 (default)

You can change the gRPC port by setting the `GRPC_PORT` environment variable.

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

You can run both servers simultaneously using the provided run.sh script.

### Running Tests

```bash
# Using the shell script
chmod +x ./test.sh
./test.sh

# Or using npm
npm run test
```

This will execute the test suite that compares the REST and gRPC API implementations.

## Example Client

An example client implementation is provided in `client/client.js`. You can run it to see how to interact with the gRPC server:

```bash
# Using the provided script
chmod +x ./run-client.sh
./run-client.sh

# Or directly with node
node client/client.js
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

## Generated TypeScript Types

The project includes automatically generated TypeScript definitions for the Protocol Buffer definitions. These are located in the `src/proto/` directory. You can regenerate these types using:

```bash
npm run protoc
```

## Development

### Adding New Features

1. Update the Protocol Buffer definition in `proto/calendly.proto`
2. Regenerate TypeScript types with `npm run protoc`
3. Implement the service in the appropriate file under `src/services/`
4. Update tests to verify functionality

This utilizes the `concurrently` package to run both servers in parallel.

## Technology Stack

- **Backend**: Node.js
- **Database**: SQLite
- **API**: gRPC and REST
- **Documentation**: Swagger UI for REST API
- **Testing**: Custom comparison framework

## License

ISC
