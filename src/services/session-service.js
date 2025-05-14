const { dbAsync } = require('../db');
const crypto = require('crypto');
const grpc = require('@grpc/grpc-js');
const { authenticate } = require('../middleware/auth');

const sessionService = {
  // Login and get authentication token
  Login: async (call, callback) => {
    try {
      const { email, password } = call.request;
      
      // Validate required fields
      if (!email || !password) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Email and password are required'
        });
      }
      
      // Find user with matching email
      const user = await dbAsync.get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (!user || user.password !== password) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid credentials'
        });
      }
      
      // Generate new token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Save token in database
      await dbAsync.run('UPDATE users SET token = ? WHERE id = ?', [token, user.id]);
      
      callback(null, { token });
    } catch (err) {
      console.error('Error during login:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  },
  
  // Logout and invalidate token
  Logout: async (call, callback) => {
    try {
      // Get authenticated user
      const user = await authenticate(call);
      
      // Invalidate token
      await dbAsync.run('UPDATE users SET token = NULL WHERE id = ?', [user.id]);
      
      callback(null, { message: 'Logout successful' });
    } catch (err) {
      if (err.code) {
        return callback(err);
      }
      
      console.error('Error during logout:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Database error'
      });
    }
  }
};

module.exports = sessionService;
