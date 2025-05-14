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
  
  // Run all tests
  async runTests() {
    try {
      console.log('Starting API Comparison Tests...\n');
      
      await this.testCreateUser();
      await this.testLogin();
      await this.testCreateEvent();
      await this.testCreateSchedule();
      await this.testCreateAppointment();
      await this.testListAppointments();
      await this.testUpdateAppointment();
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
