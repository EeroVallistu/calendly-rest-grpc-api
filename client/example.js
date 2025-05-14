const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

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

// Set up clients
const userClient = new calendlyProto.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const sessionClient = new calendlyProto.SessionService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const eventClient = new calendlyProto.EventService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const scheduleClient = new calendlyProto.ScheduleService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const appointmentClient = new calendlyProto.AppointmentService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Helper function to make token-authenticated requests
const makeAuthenticatedRequest = (client, method, request, token) => {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.add('authorization', `Bearer ${token}`);
    
    client[method](request, metadata, (err, response) => {
      if (err) {
        return reject(err);
      }
      resolve(response);
    });
  });
};

// Promise-based wrappers for client methods
const promisifyClient = (client) => {
  return new Proxy({}, {
    get: (_, method) => {
      return (request = {}, token = null) => {
        if (token) {
          return makeAuthenticatedRequest(client, method, request, token);
        } else {
          return new Promise((resolve, reject) => {
            client[method](request, (err, response) => {
              if (err) {
                return reject(err);
              }
              resolve(response);
            });
          });
        }
      };
    }
  });
};

// Create promisified clients
const user = promisifyClient(userClient);
const session = promisifyClient(sessionClient);
const event = promisifyClient(eventClient);
const schedule = promisifyClient(scheduleClient);
const appointment = promisifyClient(appointmentClient);

// Main function to demonstrate client usage
async function main() {
  try {
    console.log('> Demonstrating gRPC client functionality');
    
    // Example 1: Create a user
    console.log('\n1. Creating a new user...');
    const newUser = await user.CreateUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      timezone: 'Europe/Tallinn'
    });
    console.log('User created:', newUser);
    
    // Example 2: Login to get a token
    console.log('\n2. Logging in with the new user...');
    const loginResponse = await session.Login({
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('Login successful, token:', loginResponse.token);
    const token = loginResponse.token;
    
    // Example 3: Create an event
    console.log('\n3. Creating a new event...');
    const newEvent = await event.CreateEvent({
      name: 'Meeting',
      duration: 30,
      description: 'Quick catch-up',
      color: '#FF5733'
    }, token);
    console.log('Event created:', newEvent);
    
    // Example 4: List all events
    console.log('\n4. Listing all events...');
    const events = await event.ListEvents({}, token);
    console.log('Events:', events);
    
    // Example 5: Create a schedule
    console.log('\n5. Creating a schedule...');
    const newSchedule = await schedule.CreateSchedule({
      user_id: newUser.id,
      availability: {
        days: [
          {
            day: 'Monday',
            time_ranges: [
              {
                start_time: '09:00',
                end_time: '17:00'
              }
            ]
          }
        ]
      }
    }, token);
    console.log('Schedule created:', newSchedule);
    
    // Example 6: Create an appointment
    console.log('\n6. Creating an appointment...');
    const newAppointment = await appointment.CreateAppointment({
      event_id: newEvent.id,
      invitee_email: 'invitee@example.com',
      start_time: '2025-05-15T10:00:00Z',
      end_time: '2025-05-15T10:30:00Z'
    }, token);
    console.log('Appointment created:', newAppointment);
    
    // Example 7: List all appointments
    console.log('\n7. Listing all appointments...');
    const appointments = await appointment.ListAppointments({}, token);
    console.log('Appointments:', appointments);
    
    // Example 8: Update appointment
    console.log('\n8. Updating appointment...');
    const updatedAppointment = await appointment.UpdateAppointment({
      appointment_id: newAppointment.id,
      status: 'confirmed'
    }, token);
    console.log('Updated appointment:', updatedAppointment);
    
    // Example 9: Logout
    console.log('\n9. Logging out...');
    const logoutResponse = await session.Logout({}, token);
    console.log('Logout response:', logoutResponse);

    console.log('\nAll client examples completed successfully!');
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Details:', err.details || err);
  }
}

// Run the examples
if (require.main === module) {
  main();
}

module.exports = {
  user,
  session,
  event,
  schedule,
  appointment
};
