const axios = require('axios');
const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');
const assert = require('assert');

// Load gRPC client
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

// Configuration
const REST_API_BASE_URL = 'http://localhost:3000';
const GRPC_SERVER_ADDRESS = 'localhost:50051';

// Test data
const TEST_USER = {
  name: 'Test User',
  email: `test_${Date.now()}@example.com`,
  password: 'password123',
  timezone: 'Europe/Tallinn'
};

// Test class to run all tests
class CalendlyAPITest {
  constructor() {
    // Set up REST client
    this.restClient = axios.create({
      baseURL: REST_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Set up gRPC clients
    this.userClient = new calendlyProto.UserService(
      GRPC_SERVER_ADDRESS,
      grpc.credentials.createInsecure()
    );
    
    this.sessionClient = new calendlyProto.SessionService(
      GRPC_SERVER_ADDRESS,
      grpc.credentials.createInsecure()
    );
    
    this.eventClient = new calendlyProto.EventService(
      GRPC_SERVER_ADDRESS,
      grpc.credentials.createInsecure()
    );
    
    this.scheduleClient = new calendlyProto.ScheduleService(
      GRPC_SERVER_ADDRESS,
      grpc.credentials.createInsecure()
    );
    
    this.appointmentClient = new calendlyProto.AppointmentService(
      GRPC_SERVER_ADDRESS,
      grpc.credentials.createInsecure()
    );
    
    // Storage for test data between tests
    this.testData = {
      restUser: null,
      grpcUser: null,
      restToken: null,
      grpcToken: null,
      restEvent: null,
      grpcEvent: null,
      restAppointment: null,
      grpcAppointment: null
    };
    
    // Count for tracking tests
    this.totalTests = 0;
    this.passedTests = 0;
  }
  
  // Helper: Make authenticated gRPC request
  makeAuthenticatedGrpcRequest(client, method, request, token) {
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
  }
  
  // Helper: Make unauthenticated gRPC request
  makeGrpcRequest(client, method, request) {
    return new Promise((resolve, reject) => {
      client[method](request, (err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      });
    });
  }
  
  // Test: Create user
  async testCreateUser() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.post('/users', TEST_USER);
      this.testData.restUser = restResponse.data;
      
      // gRPC call
      const grpcUser = await this.makeGrpcRequest(this.userClient, 'createUser', {
        name: TEST_USER.name,
        email: `test_grpc_${Date.now()}@example.com`,
        password: TEST_USER.password,
        timezone: TEST_USER.timezone
      });
      this.testData.grpcUser = grpcUser;
      
      // Verify both APIs return similar structure
      assert(restResponse.data.id, 'REST API should return user ID');
      assert(grpcUser.id, 'gRPC API should return user ID');
      assert(restResponse.data.name === TEST_USER.name && grpcUser.name === TEST_USER.name, 'Both APIs should return the correct name');
      
      console.log('✓ Create user: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Create user: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Login
  async testLogin() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.post('/sessions', {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      this.testData.restToken = restResponse.data.token;
      
      // gRPC call
      const grpcResponse = await this.makeGrpcRequest(this.sessionClient, 'login', {
        email: this.testData.grpcUser.email,
        password: TEST_USER.password
      });
      this.testData.grpcToken = grpcResponse.token;
      
      // Update REST client with token
      this.restClient.defaults.headers.common['Authorization'] = `Bearer ${this.testData.restToken}`;
      
      // Verify both APIs return token
      assert(this.testData.restToken, 'REST API should return token');
      assert(this.testData.grpcToken, 'gRPC API should return token');
      
      console.log('✓ Login: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Login: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Create event
  async testCreateEvent() {
    this.totalTests++;
    try {
      const eventData = {
        name: 'Test Meeting',
        duration: 30,
        description: 'Test description',
        color: '#FF5733'
      };
      
      // REST API call
      const restResponse = await this.restClient.post('/events', eventData);
      this.testData.restEvent = restResponse.data;
      
      // gRPC call
      const grpcEvent = await this.makeAuthenticatedGrpcRequest(
        this.eventClient,
        'createEvent',
        eventData,
        this.testData.grpcToken
      );
      this.testData.grpcEvent = grpcEvent;
      
      // Verify both APIs return similar structure
      assert(restResponse.data.id && grpcEvent.id, 'Both APIs should return event ID');
      assert(restResponse.data.name === eventData.name && grpcEvent.name === eventData.name, 'Both APIs should return correct event name');
      assert(restResponse.data.duration === eventData.duration && grpcEvent.duration === eventData.duration, 'Both APIs should return correct duration');
      
      console.log('✓ Create event: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Create event: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Create schedule
  async testCreateSchedule() {
    this.totalTests++;
    try {
      const availabilityData = {
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
      };
      
      // REST API call
      const restResponse = await this.restClient.post('/schedules', {
        userId: this.testData.restUser.id,
        availability: availabilityData.days
      });
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.scheduleClient,
        'createSchedule',
        {
          user_id: this.testData.grpcUser.id,
          availability: availabilityData
        },
        this.testData.grpcToken
      );
      
      // Verify both APIs return success
      assert(restResponse.status === 201 || restResponse.status === 200, 'REST API should return success');
      assert(grpcResponse.user_id === this.testData.grpcUser.id, 'gRPC API should return correct user ID');
      
      console.log('✓ Create schedule: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Create schedule: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Create appointment
  async testCreateAppointment() {
    this.totalTests++;
    try {
      const appointmentData = {
        eventId: this.testData.restEvent.id,
        inviteeEmail: 'invitee@example.com',
        startTime: '2025-05-15T10:00:00Z',
        endTime: '2025-05-15T10:30:00Z'
      };
      
      const grpcAppointmentData = {
        event_id: this.testData.grpcEvent.id,
        invitee_email: 'grpc_invitee@example.com',
        start_time: '2025-05-15T11:00:00Z',
        end_time: '2025-05-15T11:30:00Z'
      };
      
      // REST API call
      const restResponse = await this.restClient.post('/appointments', appointmentData);
      this.testData.restAppointment = restResponse.data;
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.appointmentClient,
        'createAppointment',
        grpcAppointmentData,
        this.testData.grpcToken
      );
      this.testData.grpcAppointment = grpcResponse;
      
      // Verify both APIs return similar structure
      assert(restResponse.data.id && grpcResponse.id, 'Both APIs should return appointment ID');
      assert(restResponse.data.status === 'scheduled' && grpcResponse.status === 'scheduled', 'Both APIs should return scheduled status');
      
      console.log('✓ Create appointment: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Create appointment: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: List appointments
  async testListAppointments() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get('/appointments');
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.appointmentClient,
        'listAppointments',
        {},
        this.testData.grpcToken
      );
      
      // Verify both APIs return arrays
      assert(Array.isArray(restResponse.data), 'REST API should return an array');
      assert(Array.isArray(grpcResponse.appointments), 'gRPC API should return an array');
      
      console.log('✓ List appointments: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ List appointments: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Update appointment
  async testUpdateAppointment() {
    this.totalTests++;
    try {
      const updateData = {
        status: 'confirmed'
      };
      
      // REST API call
      const restResponse = await this.restClient.patch(`/appointments/${this.testData.restAppointment.id}`, updateData);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.appointmentClient,
        'updateAppointment',
        {
          appointment_id: this.testData.grpcAppointment.id,
          status: updateData.status
        },
        this.testData.grpcToken
      );
      
      // Verify both APIs updated correctly
      assert(restResponse.data.status === updateData.status, 'REST API should update status');
      assert(grpcResponse.status === updateData.status, 'gRPC API should update status');
      
      console.log('✓ Update appointment: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Update appointment: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Logout
  async testLogout() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.delete('/sessions');
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.sessionClient,
        'logout',
        {},
        this.testData.grpcToken
      );
      
      // Verify both APIs return success message
      assert(restResponse.data.message, 'REST API should return message');
      assert(grpcResponse.message, 'gRPC API should return message');
      
      console.log('✓ Logout: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Logout: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Get user by ID
  async testGetUser() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get(`/users/${this.testData.restUser.id}`);
      
      // gRPC call
      const grpcUser = await this.makeAuthenticatedGrpcRequest(
        this.userClient,
        'getUser',
        { user_id: this.testData.grpcUser.id },
        this.testData.grpcToken
      );
      
      // Verify both APIs return similar structure
      assert(restResponse.data.id === this.testData.restUser.id, 'REST API should return correct user ID');
      assert(grpcUser.id === this.testData.grpcUser.id, 'gRPC API should return correct user ID');
      assert(restResponse.data.name === TEST_USER.name && grpcUser.name === TEST_USER.name, 'Both APIs should return the correct name');
      
      console.log('✓ Get user: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Get user: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: List users
  async testListUsers() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get('/users');
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.userClient,
        'listUsers',
        { page: 1, page_size: 20 },
        this.testData.grpcToken
      );
      
      // Verify both APIs return arrays/collections
      assert(Array.isArray(restResponse.data.data), 'REST API should return an array of users');
      assert(Array.isArray(grpcResponse.users), 'gRPC API should return an array of users');
      
      console.log('✓ List users: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ List users: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Update user
  async testUpdateUser() {
    this.totalTests++;
    try {
      const updateData = {
        name: 'Updated Test User'
      };
      
      // REST API call
      const restResponse = await this.restClient.patch(`/users/${this.testData.restUser.id}`, updateData);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.userClient,
        'updateUser',
        {
          user_id: this.testData.grpcUser.id,
          name: updateData.name
        },
        this.testData.grpcToken
      );
      
      // Verify both APIs updated correctly
      assert(restResponse.data.name === updateData.name, 'REST API should update name');
      assert(grpcResponse.name === updateData.name, 'gRPC API should update name');
      
      console.log('✓ Update user: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Update user: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Get event
  async testGetEvent() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get(`/events/${this.testData.restEvent.id}`);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.eventClient,
        'getEvent',
        { event_id: this.testData.grpcEvent.id },
        this.testData.grpcToken
      );
      
      // Verify both APIs return correct event
      assert(restResponse.data.id === this.testData.restEvent.id, 'REST API should return correct event ID');
      assert(grpcResponse.id === this.testData.grpcEvent.id, 'gRPC API should return correct event ID');
      assert(restResponse.data.name === this.testData.restEvent.name && grpcResponse.name === this.testData.grpcEvent.name, 
             'Both APIs should return correct event name');
      
      console.log('✓ Get event: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Get event: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: List events
  async testListEvents() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get('/events');
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.eventClient,
        'listEvents',
        {},
        this.testData.grpcToken
      );
      
      // Verify both APIs return arrays
      assert(Array.isArray(restResponse.data), 'REST API should return an array of events');
      assert(Array.isArray(grpcResponse.events), 'gRPC API should return an array of events');
      
      console.log('✓ List events: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ List events: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Update event
  async testUpdateEvent() {
    this.totalTests++;
    try {
      const updateData = {
        name: 'Updated Test Meeting',
        description: 'Updated description',
        duration: 45 // Adding duration to satisfy NOT NULL constraint
      };
      
      // REST API call
      const restResponse = await this.restClient.patch(`/events/${this.testData.restEvent.id}`, updateData);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.eventClient,
        'updateEvent',
        {
          event_id: this.testData.grpcEvent.id,
          name: updateData.name,
          description: updateData.description,
          duration: updateData.duration
        },
        this.testData.grpcToken
      );
      
      // Verify both APIs updated correctly
      assert(restResponse.data.name === updateData.name, 'REST API should update event name');
      assert(grpcResponse.name === updateData.name, 'gRPC API should update event name');
      assert(restResponse.data.description === updateData.description && grpcResponse.description === updateData.description, 
             'Both APIs should update description');
      
      console.log('✓ Update event: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Update event: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Get schedule
  async testGetSchedule() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get(`/schedules/${this.testData.restUser.id}`);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.scheduleClient,
        'getSchedule',
        { user_id: this.testData.grpcUser.id },
        this.testData.grpcToken
      );
      
      // Verify both APIs return user_id/userId
      assert(restResponse.data.userId === this.testData.restUser.id, 'REST API should return correct user ID');
      assert(grpcResponse.user_id === this.testData.grpcUser.id, 'gRPC API should return correct user ID');
      
      console.log('✓ Get schedule: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Get schedule: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Get appointment
  async testGetAppointment() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get(`/appointments/${this.testData.restAppointment.id}`);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.appointmentClient,
        'getAppointment',
        { appointment_id: this.testData.grpcAppointment.id },
        this.testData.grpcToken
      );
      
      // Verify both APIs return similar structure
      assert(restResponse.data.id === this.testData.restAppointment.id, 'REST API should return correct appointment ID');
      assert(grpcResponse.id === this.testData.grpcAppointment.id, 'gRPC API should return correct appointment ID');
      assert(restResponse.data.status === this.testData.restAppointment.status && 
             grpcResponse.status === this.testData.grpcAppointment.status, 
             'Both APIs should return correct status');
      
      console.log('✓ Get appointment: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Get appointment: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Delete appointment
  async testDeleteAppointment() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.delete(`/appointments/${this.testData.restAppointment.id}`);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.appointmentClient,
        'deleteAppointment',
        { appointment_id: this.testData.grpcAppointment.id },
        this.testData.grpcToken
      );
      
      // Verify both APIs delete successfully (no error means success)
      console.log('✓ Delete appointment: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Delete appointment: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Delete event
  async testDeleteEvent() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.delete(`/events/${this.testData.restEvent.id}`);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.eventClient,
        'deleteEvent',
        { event_id: this.testData.grpcEvent.id },
        this.testData.grpcToken
      );
      
      // Verify both APIs delete successfully (no error means success)
      console.log('✓ Delete event: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Delete event: FAILED', err.message);
      throw err;
    }
  }
  

  
  // Test: Delete user
  async testDeleteUser() {
    this.totalTests++;
    try {
      // Create a temporary user for deletion
      const tempUserData = {
        name: 'Temp Delete User',
        email: `temp_delete_${Date.now()}@example.com`,
        password: 'password123',
        timezone: 'Europe/Tallinn'
      };
      
      // Create users in both APIs
      const restTempUser = await this.restClient.post('/users', tempUserData);
      const tempUserEmail = `temp_delete_grpc_${Date.now()}@example.com`;
      const grpcTempUser = await this.makeGrpcRequest(this.userClient, 'createUser', {
        name: tempUserData.name,
        email: tempUserEmail,
        password: tempUserData.password,
        timezone: tempUserData.timezone
      });
      
      // Log in to get tokens for these users
      const restTempToken = (await this.restClient.post('/sessions', {
        email: tempUserData.email,
        password: tempUserData.password
      })).data.token;
      
      const grpcTempToken = (await this.makeGrpcRequest(this.sessionClient, 'login', {
        email: tempUserEmail,
        password: tempUserData.password
      })).token;
      
      // REST API call to delete
      const restAuthClient = axios.create({
        baseURL: REST_API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${restTempToken}`
        }
      });
      
      const restResponse = await restAuthClient.delete(`/users/${restTempUser.data.id}`);
      
      // gRPC call to delete
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.userClient,
        'deleteUser',
        { user_id: grpcTempUser.id },
        grpcTempToken
      );
      
      // Verify both APIs delete successfully (no error means success)
      console.log('✓ Delete user: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Delete user: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: List schedules
  async testListSchedules() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.get('/schedules');
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.scheduleClient,
        'listSchedules',
        {},
        this.testData.grpcToken
      );
      
      // Verify both APIs return arrays/collections
      assert(Array.isArray(restResponse.data), 'REST API should return an array of schedules');
      assert(Array.isArray(grpcResponse.schedules), 'gRPC API should return an array of schedules');
      
      console.log('✓ List schedules: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ List schedules: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Update schedule
  async testUpdateSchedule() {
    this.totalTests++;
    try {
      const updatedAvailabilityData = {
        days: [
          {
            day: 'Monday',
            time_ranges: [
              {
                start_time: '10:00',
                end_time: '18:00'
              }
            ]
          },
          {
            day: 'Tuesday',
            time_ranges: [
              {
                start_time: '09:00',
                end_time: '17:00'
              }
            ]
          }
        ]
      };
      
      // REST API call
      const restResponse = await this.restClient.patch(`/schedules/${this.testData.restUser.id}`, {
        availability: updatedAvailabilityData.days
      });
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.scheduleClient,
        'updateSchedule',
        {
          user_id: this.testData.grpcUser.id,
          availability: updatedAvailabilityData
        },
        this.testData.grpcToken
      );
      
      // Verify both APIs return user_id/userId
      assert(restResponse.data.userId === this.testData.restUser.id, 'REST API should return correct user ID');
      assert(grpcResponse.user_id === this.testData.grpcUser.id, 'gRPC API should return correct user ID');
      
      console.log('✓ Update schedule: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Update schedule: FAILED', err.message);
      throw err;
    }
  }
  
  // Test: Delete schedule
  async testDeleteSchedule() {
    this.totalTests++;
    try {
      // REST API call
      const restResponse = await this.restClient.delete(`/schedules/${this.testData.restUser.id}`);
      
      // gRPC call
      const grpcResponse = await this.makeAuthenticatedGrpcRequest(
        this.scheduleClient,
        'deleteSchedule',
        { user_id: this.testData.grpcUser.id },
        this.testData.grpcToken
      );
      
      // Verify both APIs delete successfully (no error means success)
      console.log('✓ Delete schedule: PASSED');
      this.passedTests++;
    } catch (err) {
      console.error('✗ Delete schedule: FAILED', err.message);
      throw err;
    }
  }
  
  // Run all tests
  async runTests() {
    try {
      console.log('Starting API Comparison Tests...\n');
      
      // User service tests
      await this.testCreateUser();
      await this.testLogin();
      await this.testGetUser();
      await this.testListUsers();
      await this.testUpdateUser();
      
      // Event service tests
      await this.testCreateEvent();
      await this.testGetEvent();
      await this.testListEvents();
      await this.testUpdateEvent();
      
      // Schedule service tests
      await this.testCreateSchedule();
      await this.testGetSchedule();
      await this.testListSchedules();
      await this.testUpdateSchedule();
      
      // Appointment service tests
      await this.testCreateAppointment();
      await this.testGetAppointment();
      await this.testListAppointments();
      await this.testUpdateAppointment();
      
      // Deletion tests (do these last to avoid breaking other tests)
      await this.testDeleteAppointment();
      await this.testDeleteEvent();
      await this.testDeleteUser();
      await this.testDeleteSchedule();
      
      // Final logout
      await this.testLogout();
      
      console.log(`\nTests completed: ${this.passedTests}/${this.totalTests} passed`);
      
      if (this.passedTests === this.totalTests) {
        console.log('\nALL TESTS PASSED! The gRPC API is functionally equivalent to the REST API.');
        return 0; // Success exit code
      } else {
        console.error(`\nSome tests failed: ${this.totalTests - this.passedTests} failures`);
        return 1; // Failure exit code
      }
    } catch (err) {
      console.error('Test suite error:', err);
      return 1; // Failure exit code
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CalendlyAPITest();
  tester.runTests()
    .then(exitCode => process.exit(exitCode))
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

module.exports = CalendlyAPITest;
