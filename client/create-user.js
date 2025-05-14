const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Parse command line arguments (name, email, password, timezone)
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node create-user.js "User Name" "email@example.com" "password" ["timezone"]');
  process.exit(1);
}

const [name, email, password, timezone = 'Europe/Tallinn'] = args;

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
const { UserService } = protoDescriptor.calendlygrpc;

// Set up client
const userClient = new UserService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Create user
userClient.CreateUser(
  {
    name,
    email,
    password,
    timezone
  },
  (err, response) => {
    if (err) {
      console.error('Error creating user:', err.message);
      process.exit(1);
    }
    
    console.log('User created successfully:');
    console.log(JSON.stringify(response, null, 2));
  }
);
