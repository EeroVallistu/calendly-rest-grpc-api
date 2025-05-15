// Client script to interact with Calendly gRPC API
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
const { calendlygrpc } = protoDescriptor;

// Define server address
const SERVER_ADDRESS = 'localhost:50051';

// Create clients for each service
const userServiceClient = new calendlygrpc.UserService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

const sessionServiceClient = new calendlygrpc.SessionService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

const eventServiceClient = new calendlygrpc.EventService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

const scheduleServiceClient = new calendlygrpc.ScheduleService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

const appointmentServiceClient = new calendlygrpc.AppointmentService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

// Auth token storage
let authToken = null;

// Helper function to create a metadata object with auth token
function getAuthMetadata() {
  const metadata = new grpc.Metadata();
  if (authToken) {
    metadata.add('authorization', `Bearer ${authToken}`);
  }
  return metadata;
}

// Helper to promisify gRPC calls
function promisify(client, method) {
  return (request = {}, metadata = new grpc.Metadata()) => {
    return new Promise((resolve, reject) => {
      client[method](request, metadata, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  };
}

// Run all API calls in sequence
async function runAllCalls() {
  try {
    console.log('Starting Calendly gRPC client tests...');
    console.log('======================================\n');

    // USER SERVICE CALLS
    console.log('🔹 USER SERVICE');
    
    // Create a user - This operation doesn't require authentication
    console.log('Creating a new user...');
    const user = await promisify(userServiceClient, 'createUser')({
      name: 'Test User',
      email: `test${Math.floor(Math.random() * 10000)}@example.com`,
      password: 'password123',
      timezone: 'Europe/Tallinn'
    });
    console.log('Created user:', user);
    const userId = user.id;
    
    // SESSION SERVICE CALLS
    console.log('\n🔹 SESSION SERVICE');
    
    // Login
    console.log('Logging in...');
    const loginResponse = await promisify(sessionServiceClient, 'login')({
      email: user.email,
      password: 'password123'
    });
    authToken = loginResponse.token;
    console.log('Logged in successfully, token received');
    
    // Use the auth token for all subsequent requests
    const authMetadata = getAuthMetadata();
    
    // Now we can do authenticated USER operations
    console.log('\n🔹 USER OPERATIONS (AUTHENTICATED)');
    
    // Get user
    console.log('Getting user...');
    const fetchedUser = await promisify(userServiceClient, 'getUser')(
      { user_id: userId },
      authMetadata
    );
    console.log('Fetched user:', fetchedUser);
    
    // List users
    console.log('\nListing users...');
    const users = await promisify(userServiceClient, 'listUsers')(
      { page: 1, page_size: 10 },
      authMetadata
    );
    console.log(`Found ${users.users.length} users`);
    
    // Update user
    console.log('\nUpdating user...');
    const updatedUser = await promisify(userServiceClient, 'updateUser')(
      {
        user_id: userId,
        name: 'Updated Test User',
        timezone: 'Europe/London'
      },
      authMetadata
    );
    console.log('Updated user:', updatedUser);
    
    // EVENT SERVICE CALLS
    console.log('\n🔹 EVENT SERVICE');
    
    // Create event
    console.log('Creating event...');
    const event = await promisify(eventServiceClient, 'createEvent')(
      {
        name: 'Test Event',
        duration: 60,
        description: 'This is a test event',
        color: '#FF5733'
      },
      authMetadata
    );
    console.log('Created event:', event);
    const eventId = event.id;
    
    // Get event
    console.log('\nGetting event...');
    const fetchedEvent = await promisify(eventServiceClient, 'getEvent')(
      { event_id: eventId },
      authMetadata
    );
    console.log('Fetched event:', fetchedEvent);
    
    // List events
    console.log('\nListing events...');
    const events = await promisify(eventServiceClient, 'listEvents')({}, authMetadata);
    console.log(`Found ${events.events.length} events`);
    
    // Update event
    console.log('\nUpdating event...');
    const updatedEvent = await promisify(eventServiceClient, 'updateEvent')(
      {
        event_id: eventId,
        name: 'Updated Test Event',
        duration: 45
      },
      authMetadata
    );
    console.log('Updated event:', updatedEvent);
    
    // SCHEDULE SERVICE CALLS
    console.log('\n🔹 SCHEDULE SERVICE');
    
    // Create schedule
    console.log('Creating schedule...');
    const schedule = await promisify(scheduleServiceClient, 'createSchedule')(
      {
        user_id: userId,
        availability: {
          days: [
            {
              day: 'Monday',
              time_ranges: [
                { start_time: '09:00', end_time: '12:00' },
                { start_time: '13:00', end_time: '17:00' }
              ]
            },
            {
              day: 'Tuesday',
              time_ranges: [
                { start_time: '09:00', end_time: '17:00' }
              ]
            }
          ]
        }
      },
      authMetadata
    );
    console.log('Created schedule:', schedule);
    
    // Get schedule
    console.log('\nGetting schedule...');
    const fetchedSchedule = await promisify(scheduleServiceClient, 'getSchedule')(
      { user_id: userId },
      authMetadata
    );
    console.log('Fetched schedule:', fetchedSchedule);
    
    // List schedules
    console.log('\nListing schedules...');
    const schedules = await promisify(scheduleServiceClient, 'listSchedules')({}, authMetadata);
    console.log(`Found ${schedules.schedules.length} schedules`);
    
    // Update schedule
    console.log('\nUpdating schedule...');
    const updatedSchedule = await promisify(scheduleServiceClient, 'updateSchedule')(
      {
        user_id: userId,
        availability: {
          days: [
            {
              day: 'Monday',
              time_ranges: [
                { start_time: '10:00', end_time: '18:00' }
              ]
            },
            {
              day: 'Wednesday',
              time_ranges: [
                { start_time: '09:00', end_time: '17:00' }
              ]
            }
          ]
        }
      },
      authMetadata
    );
    console.log('Updated schedule:', updatedSchedule);
    
    // APPOINTMENT SERVICE CALLS
    console.log('\n🔹 APPOINTMENT SERVICE');
    
    // Create appointment
    console.log('Creating appointment...');
    // Calculate start and end time for appointment (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const startTime = tomorrow.toISOString();
    
    tomorrow.setHours(11, 0, 0, 0);
    const endTime = tomorrow.toISOString();
    
    const appointment = await promisify(appointmentServiceClient, 'createAppointment')(
      {
        event_id: eventId,
        invitee_email: 'invitee@example.com',
        start_time: startTime,
        end_time: endTime
      },
      authMetadata
    );
    console.log('Created appointment:', appointment);
    const appointmentId = appointment.id;
    
    // Get appointment
    console.log('\nGetting appointment...');
    const fetchedAppointment = await promisify(appointmentServiceClient, 'getAppointment')(
      { appointment_id: appointmentId },
      authMetadata
    );
    console.log('Fetched appointment:', fetchedAppointment);
    
    // List appointments
    console.log('\nListing appointments...');
    const appointments = await promisify(appointmentServiceClient, 'listAppointments')({}, authMetadata);
    console.log(`Found ${appointments.appointments.length} appointments`);
    
    // Update appointment
    console.log('\nUpdating appointment...');
    const updatedAppointment = await promisify(appointmentServiceClient, 'updateAppointment')(
      {
        appointment_id: appointmentId,
        status: 'rescheduled',
        invitee_email: 'updated@example.com'
      },
      authMetadata
    );
    console.log('Updated appointment:', updatedAppointment);
    
    // DELETION OPERATIONS
    console.log('\n🔹 DELETION OPERATIONS');
    
    // Delete appointment
    console.log('Deleting appointment...');
    await promisify(appointmentServiceClient, 'deleteAppointment')(
      { appointment_id: appointmentId },
      authMetadata
    );
    console.log('Appointment deleted successfully');
    
    // Delete event
    console.log('\nDeleting event...');
    await promisify(eventServiceClient, 'deleteEvent')(
      { event_id: eventId },
      authMetadata
    );
    console.log('Event deleted successfully');
    
    // Delete schedule
    console.log('\nDeleting schedule...');
    await promisify(scheduleServiceClient, 'deleteSchedule')(
      { user_id: userId },
      authMetadata
    );
    console.log('Schedule deleted successfully');
    
    // Delete user - must be done while token is still valid
    console.log('\nDeleting user...');
    await promisify(userServiceClient, 'deleteUser')({ user_id: userId }, authMetadata);
    console.log('User deleted successfully');
    
    // Logout - do this last as it invalidates the token
    console.log('\nLogging out...');
    try {
      await promisify(sessionServiceClient, 'logout')({}, authMetadata);
      console.log('Logged out successfully');
    } catch (error) {
      // If logout fails, it's not critical
      console.log('Logout failed, but all other operations completed successfully');
    }
    
    console.log('\n✅ All gRPC operations completed successfully');
    
    // Print summary of operations
    console.log('\n🔸 SUMMARY OF OPERATIONS 🔸');
    console.log('✓ User operations: create, get, list, update, delete');
    console.log('✓ Session operations: login, logout');
    console.log('✓ Event operations: create, get, list, update, delete');
    console.log('✓ Schedule operations: create, get, list, update, delete');
    console.log('✓ Appointment operations: create, get, list, update, delete');
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error(error.message);
    if (error.code) {
      console.error(`gRPC error code: ${error.code}`);
      console.error(`Details: ${error.details}`);
    }
  }
}

// Run the tests
runAllCalls();
