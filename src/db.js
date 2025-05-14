const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

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
  await dbAsync.serialize(async () => {
    await dbAsync.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      timezone TEXT,
      token TEXT
    )`);

    await dbAsync.run(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      description TEXT,
      color TEXT,
      userId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    await dbAsync.run(`CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      availability TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    await dbAsync.run(`CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      inviteeEmail TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      FOREIGN KEY (eventId) REFERENCES events(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);
  });

  console.log('Database initialized');
};

module.exports = {
  db,
  dbAsync,
  initializeDb
};
