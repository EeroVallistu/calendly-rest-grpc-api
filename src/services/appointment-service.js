const { dbAsync } = require('../db');
const { isValidEmail } = require('../utils/validators');
const { authenticate } = require('../middleware/auth');
const grpc = require('@grpc/grpc-js');

const appointmentService = {
  // Create a new appointment
  CreateAppointment: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { event_id, invitee_email, start_time, end_time } = call.request;
      const status = 'scheduled'; // Default status
      
      // Validate required fields
      if (!event_id || !invitee_email || !start_time || !end_time) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'All fields are required'
        });
      }
      
      // Validate email format
      if (!isValidEmail(invitee_email)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid invitee email format'
        });
      }
      
      // Generate simple ID
      const id = Date.now().toString();
      
      // Insert appointment into database
      await dbAsync.run(
        'INSERT INTO appointments (id, eventId, userId, inviteeEmail, startTime, endTime, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, event_id, user.id, invitee_email, start_time, end_time, status]
      );
      
      callback(null, {
        id,
        event_id,
        user_id: user.id,
        invitee_email,
        start_time,
        end_time,
        status
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error creating appointment:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Get appointment by ID
  GetAppointment: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { appointment_id } = call.request;
      
      // Get appointment from database
      const appointment = await dbAsync.get(
        'SELECT * FROM appointments WHERE id = ? AND userId = ?',
        [appointment_id, user.id]
      );
      
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      callback(null, {
        id: appointment.id,
        event_id: appointment.eventId,
        user_id: appointment.userId,
        invitee_email: appointment.inviteeEmail,
        start_time: appointment.startTime,
        end_time: appointment.endTime,
        status: appointment.status
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error getting appointment:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // List all appointments for authenticated user
  ListAppointments: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      // Get appointments from database
      const appointments = await dbAsync.all(
        'SELECT * FROM appointments WHERE userId = ?',
        [user.id]
      );
      
      // Format appointments for response
      const formattedAppointments = appointments.map(appointment => ({
        id: appointment.id,
        event_id: appointment.eventId,
        user_id: appointment.userId,
        invitee_email: appointment.inviteeEmail,
        start_time: appointment.startTime,
        end_time: appointment.endTime,
        status: appointment.status
      }));
      
      callback(null, { appointments: formattedAppointments });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error listing appointments:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Update an appointment
  UpdateAppointment: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { appointment_id, event_id, invitee_email, start_time, end_time, status } = call.request;
      
      // Validate at least one field is provided
      if (!event_id && !invitee_email && !start_time && !end_time && !status) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'At least one field is required'
        });
      }
      
      // Validate email format if provided
      if (invitee_email && !isValidEmail(invitee_email)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid invitee email format'
        });
      }
      
      // Check if appointment exists and user is owner
      const existingAppointment = await dbAsync.get(
        'SELECT * FROM appointments WHERE id = ?',
        [appointment_id]
      );
      
      if (!existingAppointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      if (existingAppointment.userId !== user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Forbidden: You can only modify your own appointments'
        });
      }
      
      // Build update query
      const fields = [];
      const values = [];
      
      if (event_id) {
        fields.push('eventId = ?');
        values.push(event_id);
      }
      if (invitee_email) {
        fields.push('inviteeEmail = ?');
        values.push(invitee_email);
      }
      if (start_time) {
        fields.push('startTime = ?');
        values.push(start_time);
      }
      if (end_time) {
        fields.push('endTime = ?');
        values.push(end_time);
      }
      if (status) {
        fields.push('status = ?');
        values.push(status);
      }
      
      values.push(appointment_id);
      
      const query = `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`;
      
      // Execute update
      const result = await dbAsync.run(query, values);
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found or no changes made'
        });
      }
      
      // Get updated appointment
      const updatedAppointment = await dbAsync.get(
        'SELECT * FROM appointments WHERE id = ?',
        [appointment_id]
      );
      
      callback(null, {
        id: updatedAppointment.id,
        event_id: updatedAppointment.eventId,
        user_id: updatedAppointment.userId,
        invitee_email: updatedAppointment.inviteeEmail,
        start_time: updatedAppointment.startTime,
        end_time: updatedAppointment.endTime,
        status: updatedAppointment.status
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error updating appointment:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Delete an appointment
  DeleteAppointment: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { appointment_id } = call.request;
      
      // Check if appointment exists and user is owner
      const existingAppointment = await dbAsync.get(
        'SELECT userId FROM appointments WHERE id = ?',
        [appointment_id]
      );
      
      if (!existingAppointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      if (existingAppointment.userId !== user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Forbidden: You can only delete your own appointments'
        });
      }
      
      // Delete appointment
      const result = await dbAsync.run(
        'DELETE FROM appointments WHERE id = ?',
        [appointment_id]
      );
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      callback(null, {});
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error deleting appointment:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  }
};

module.exports = appointmentService;
