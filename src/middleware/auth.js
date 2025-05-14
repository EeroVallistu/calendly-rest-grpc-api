const { dbAsync } = require('../db');
const grpc = require('@grpc/grpc-js');

// Authentication middleware for gRPC
const authenticate = async (call) => {
  try {
    const metadata = call.metadata;
    const token = metadata.get('authorization')[0].split(' ')[1]; // Extract Bearer token
    
    if (!token) {
      throw new Error('No token provided');
    }
    
    // Verify the token
    const user = await dbAsync.get('SELECT * FROM users WHERE token = ?', [token]);
    
    if (!user) {
      throw new Error('Invalid token');
    }

    return user;
  } catch (err) {
    throw {
      code: grpc.status.UNAUTHENTICATED,
      message: 'Unauthorized: ' + (err.message || 'Authentication failed')
    };
  }
};

// Check if user has ownership of resource
const checkOwnership = (userId, resourceOwnerId) => {
  if (userId !== resourceOwnerId) {
    throw {
      code: grpc.status.PERMISSION_DENIED,
      message: 'Forbidden: You can only access or modify your own data'
    };
  }
};

module.exports = {
  authenticate,
  checkOwnership
};
