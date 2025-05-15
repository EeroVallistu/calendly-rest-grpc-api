const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use the database from the calendly-clone-api folder
const dbPath = path.join(__dirname, '../calendly-clone-api/database.db');

// Check if the database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  console.error('Make sure the database.db file exists in the calendly-clone-api folder');
  process.exit(1); // Exit the process with an error code
}

console.log(`Using database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to database successfully');
  }
});

// Create promise wrapper for database operations
const dbAsync = {
  all: (query, params) => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  get: (query, params) => {
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  run: (query, params) => {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  serialize: (cb) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        try {
          cb();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }
};

// Initialize the database with the required tables
const initializeDb = async () => {
  // We're using the database from the root folder (same as REST API)
  console.log('Verifying database tables in the root project database');
  
  try {
    // First, check if we can access the database at all
    const dbTest = await dbAsync.get("PRAGMA database_list");
    console.log('Database accessible, file path:', dbTest.file);
    
    // Check required tables exist
    const tables = [
      'users', 'events', 'schedules', 'appointments'
    ];
    
    let missingTables = [];
    for (const table of tables) {
      const exists = await dbAsync.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", 
        [table]
      );
      
      if (!exists) {
        console.warn(`Warning: Table '${table}' not found in the database`);
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      console.error('Missing required tables:', missingTables.join(', '));
      console.error('The database structure may not be compatible with this application');
    } else {
      console.log('All required database tables were found');
    }
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = {
  db,
  dbAsync,
  initializeDb
};
