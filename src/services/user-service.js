const { dbAsync } = require('../db');
const { isValidEmail } = require('../utils/validators');
const { authenticate, checkOwnership } = require('../middleware/auth');
const grpc = require('@grpc/grpc-js');

const userService = {
  // Create a new user
  CreateUser: async (call, callback) => {
    try {
      const { name, email, password, timezone } = call.request;
      
      // Validate required fields
      if (!name || !email || !password) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Name, email, and password are required'
        });
      }

      // Validate email format
      if (!isValidEmail(email)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid email format'
        });
      }

      // Generate simple ID
      const id = Date.now().toString();
      
      try {
        // Insert user into database
        await dbAsync.run(
          'INSERT INTO users (id, name, email, password, timezone) VALUES (?, ?, ?, ?, ?)',
          [id, name, email, password, timezone || null]
        );
        
        // Return created user (without password)
        callback(null, { id, name, email, timezone: timezone || '' });
      } catch (err) {
        // Check for unique constraint violation on email
        if (err.message && err.message.includes('UNIQUE constraint failed: users.email')) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: 'Email already in use'
          });
        }
        throw err;
      }
    } catch (err) {
      console.error('Error creating user:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },

  // Get a user by ID
  GetUser: async (call, callback) => {
    try {
      // Authenticate the user
      const authenticatedUser = await authenticate(call);
      
      const { user_id } = call.request;
      const user = await dbAsync.get('SELECT id, name, email, timezone FROM users WHERE id = ?', [user_id]);
      
      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }
      
      callback(null, user);
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error getting user:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },

  // List users with pagination
  ListUsers: async (call, callback) => {
    try {
      // Authenticate the user
      await authenticate(call);
      
      const { page = 1, page_size = 20 } = call.request;
      const offset = (page - 1) * page_size;
      
      const users = await dbAsync.all(
        'SELECT id, name, email, timezone FROM users LIMIT ? OFFSET ?',
        [page_size, offset]
      );
      
      callback(null, {
        users,
        pagination: {
          page: parseInt(page),
          page_size: parseInt(page_size),
          total: users.length
        }
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error listing users:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },

  // Update a user
  UpdateUser: async (call, callback) => {
    try {
      // Authenticate the user
      const authenticatedUser = await authenticate(call);
      
      const { user_id, name, email, password, timezone } = call.request;
      
      // Check ownership
      checkOwnership(authenticatedUser.id, user_id);
      
      // Validate that at least one field is provided
      if (!name && !email && !password && !timezone) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'At least one field is required'
        });
      }
      
      // Validate email format if provided
      if (email && !isValidEmail(email)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid email format'
        });
      }
      
      // Build update query
      const fields = [];
      const values = [];
      
      if (name) {
        fields.push('name = ?');
        values.push(name);
      }
      if (email) {
        fields.push('email = ?');
        values.push(email);
      }
      if (password) {
        fields.push('password = ?');
        values.push(password);
      }
      if (timezone) {
        fields.push('timezone = ?');
        values.push(timezone);
      }
      
      values.push(user_id);
      
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      
      const result = await dbAsync.run(query, values);
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }
      
      // Fetch updated user data for response
      const updatedUser = await dbAsync.get('SELECT id, name, email, timezone FROM users WHERE id = ?', [user_id]);
      
      callback(null, updatedUser);
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error updating user:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },

  // Delete a user
  DeleteUser: async (call, callback) => {
    try {
      // Authenticate the user
      const authenticatedUser = await authenticate(call);
      
      const { user_id } = call.request;
      
      // Check ownership
      checkOwnership(authenticatedUser.id, user_id);
      
      const result = await dbAsync.run('DELETE FROM users WHERE id = ?', [user_id]);
      
      if (result.changes === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }
      
      callback(null, {});
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error deleting user:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },

  // Get authenticated user's profile
  GetUserProfile: async (call, callback) => {
    try {
      // Authenticate the user
      const authenticatedUser = await authenticate(call);
      
      callback(null, {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        timezone: authenticatedUser.timezone || ''
      });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error getting user profile:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  }
};

module.exports = userService;
