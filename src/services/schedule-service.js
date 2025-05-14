const { dbAsync } = require('../db');
const { authenticate, checkOwnership } = require('../middleware/auth');
const grpc = require('@grpc/grpc-js');

const scheduleService = {
  // Create a new schedule
  CreateSchedule: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { user_id, availability } = call.request;
      
      // Validate required fields
      if (!user_id || !availability) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'userId and availability are required'
        });
      }
      
      // Check if user is creating schedule for themselves
      if (user_id !== user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Forbidden: You can only create schedules for yourself'
        });
      }
      
      // Convert availability to JSON string
      const availabilityJson = JSON.stringify(availability);
      
      // Insert schedule into database
      await dbAsync.run(
        'INSERT INTO schedules (userId, availability) VALUES (?, ?)',
        [user_id, availabilityJson]
      );
      
      // Get the newly created schedule
      const newSchedule = await dbAsync.get(
        'SELECT * FROM schedules WHERE userId = ?',
        [user_id]
      );
      
      callback(null, {
        id: newSchedule.id,
        user_id: newSchedule.userId,
        availability: availability
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error creating schedule:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Get schedule by user ID
  GetSchedule: async (call, callback) => {
    try {
      const { user_id } = call.request;
      
      // Get schedule from database
      const schedule = await dbAsync.get('SELECT * FROM schedules WHERE userId = ?', [user_id]);
      
      if (!schedule) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Schedule not found'
        });
      }
      
      try {
        // Parse availability from JSON string
        const availability = JSON.parse(schedule.availability);
        
        callback(null, {
          id: schedule.id,
          user_id: schedule.userId,
          availability: availability
        });
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return callback({
          code: grpc.status.INTERNAL,
          message: 'Failed to parse availability data'
        });
      }
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error getting schedule:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // List all schedules for authenticated user
  ListSchedules: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      // Get schedules from database
      const schedules = await dbAsync.all('SELECT * FROM schedules WHERE userId = ?', [user.id]);
      
      // Format schedules for response
      const formattedSchedules = schedules.map(schedule => {
        try {
          const availability = JSON.parse(schedule.availability);
          return {
            id: schedule.id,
            user_id: schedule.userId,
            availability: availability
          };
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          // Skip invalid entries
          return null;
        }
      }).filter(Boolean); // Remove null entries
      
      callback(null, { schedules: formattedSchedules });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error listing schedules:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Update a schedule
  UpdateSchedule: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { user_id, availability } = call.request;
      
      // Validate required fields
      if (!availability) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Availability is required'
        });
      }
      
      // Check ownership
      checkOwnership(user.id, user_id);
      
      // Convert availability to JSON string
      const availabilityJson = JSON.stringify(availability);
      
      // Update schedule in database
      const result = await dbAsync.run(
        'UPDATE schedules SET availability = ? WHERE userId = ?',
        [availabilityJson, user_id]
      );
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Schedule not found'
        });
      }
      
      callback(null, {
        id: 0, // We don't know the ID here, but it's not important for the response
        user_id: user_id,
        availability: availability
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error updating schedule:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Delete a schedule
  DeleteSchedule: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { user_id } = call.request;
      
      // Check ownership
      checkOwnership(user.id, user_id);
      
      // Delete schedule from database
      const result = await dbAsync.run('DELETE FROM schedules WHERE userId = ?', [user_id]);
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Schedule not found'
        });
      }
      
      callback(null, {});
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error deleting schedule:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  }
};

module.exports = scheduleService;
