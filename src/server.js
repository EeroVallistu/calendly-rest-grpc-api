const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Load database module
const { initializeDb } = require('./db');

// Load service implementations
const userService = require('./services/user-service');
const sessionService = require('./services/session-service');
const eventService = require('./services/event-service');
const scheduleService = require('./services/schedule-service');
const appointmentService = require('./services/appointment-service');

// Initialize database
initializeDb()
  .then(() => startServer())
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

function startServer() {
  // Load Proto definition
  const PROTO_PATH = path.resolve(__dirname, '../proto/calendly.proto');
  
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  const calendlyProto = protoDescriptor.calendlygrpc;
  
  // Create gRPC server
  const server = new grpc.Server();
  
  // Register services
  server.addService(calendlyProto.UserService.service, userService);
  server.addService(calendlyProto.SessionService.service, sessionService);
  server.addService(calendlyProto.EventService.service, eventService);
  server.addService(calendlyProto.ScheduleService.service, scheduleService);
  server.addService(calendlyProto.AppointmentService.service, appointmentService);
  
  // Start server
  const port = process.env.GRPC_PORT || 50051;
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to bind server:', err);
        return;
      }
      
      console.log(`Server running at 0.0.0.0:${port}`);
      server.start();
    }
  );
}
