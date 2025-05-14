const { dbAsync } = require('../db');
const { isValidHexColor } = require('../utils/validators');
const { authenticate } = require('../middleware/auth');
const grpc = require('@grpc/grpc-js');

const eventService = {
  // Create a new event
  CreateEvent: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { name, duration, description, color } = call.request;
      
      // Validate required fields
      if (!name || !duration) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Name and duration are required'
        });
      }
      
      // Validate color format if provided
      if (color && !isValidHexColor(color)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Color must be a valid hex color (e.g., #FF0000)'
        });
      }
      
      // Generate simple ID
      const id = Date.now().toString();
      
      // Insert event into database
      await dbAsync.run(
        'INSERT INTO events (id, name, duration, description, color, userId) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, duration, description || null, color || null, user.id]
      );
      
      callback(null, {
        id,
        name,
        duration,
        description: description || '',
        color: color || '',
        user_id: user.id,
        is_owner: true
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error creating event:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Get an event by ID
  GetEvent: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { event_id } = call.request;
      
      // Get event from database
      const event = await dbAsync.get('SELECT * FROM events WHERE id = ?', [event_id]);
      
      if (!event) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Event not found'
        });
      }
      
      // Check if user is the owner of the event
      const isOwner = event.userId === user.id;
      
      callback(null, {
        id: event.id,
        name: event.name,
        duration: event.duration,
        description: event.description || '',
        color: event.color || '',
        user_id: event.userId,
        is_owner: isOwner
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error getting event:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Get all events for authenticated user
  ListEvents: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      // Get all events for user
      const events = await dbAsync.all('SELECT * FROM events WHERE userId = ?', [user.id]);
      
      // Format events for response
      const formattedEvents = events.map(event => ({
        id: event.id,
        name: event.name,
        duration: event.duration,
        description: event.description || '',
        color: event.color || '',
        user_id: event.userId,
        is_owner: true
      }));
      
      callback(null, { events: formattedEvents });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error listing events:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Update an event
  UpdateEvent: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { event_id, name, duration, description, color } = call.request;
      
      // Validate at least one field is provided
      if (!name && duration === null && !description && !color) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'At least one field is required'
        });
      }
      
      // Validate color format if provided
      if (color && !isValidHexColor(color)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Color must be a valid hex color (e.g., #FF0000)'
        });
      }
      
      // Check if event exists and user is owner
      const existingEvent = await dbAsync.get('SELECT * FROM events WHERE id = ?', [event_id]);
      
      if (!existingEvent) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Event not found'
        });
      }
      
      if (existingEvent.userId !== user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Forbidden: You can only modify your own events'
        });
      }
      
      // Build update query
      const fields = [];
      const values = [];
      
      if (name) {
        fields.push('name = ?');
        values.push(name);
      }
      if (duration !== null) {
        fields.push('duration = ?');
        values.push(duration);
      }
      if (description) {
        fields.push('description = ?');
        values.push(description);
      }
      if (color) {
        fields.push('color = ?');
        values.push(color);
      }
      
      values.push(event_id);
      
      const query = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;
      
      // Execute update
      const result = await dbAsync.run(query, values);
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Event not found or no changes made'
        });
      }
      
      // Get updated event
      const updatedEvent = await dbAsync.get('SELECT * FROM events WHERE id = ?', [event_id]);
      
      callback(null, {
        id: updatedEvent.id,
        name: updatedEvent.name,
        duration: updatedEvent.duration,
        description: updatedEvent.description || '',
        color: updatedEvent.color || '',
        user_id: updatedEvent.userId,
        is_owner: true
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error updating event:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Delete an event
  DeleteEvent: async (call, callback) => {
    try {
      // Authenticate the user
      const user = await authenticate(call);
      
      const { event_id } = call.request;
      
      // Check if event exists and user is owner
      const existingEvent = await dbAsync.get('SELECT userId FROM events WHERE id = ?', [event_id]);
      
      if (!existingEvent) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Event not found'
        });
      }
      
      if (existingEvent.userId !== user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Forbidden: You can only delete your own events'
        });
      }
      
      // Delete event
      const result = await dbAsync.run('DELETE FROM events WHERE id = ?', [event_id]);
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Event not found'
        });
      }
      
      callback(null, {});
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error deleting event:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  }
};

module.exports = eventService;
