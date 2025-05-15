const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the database in the calendly-clone-api folder
const dbPath = path.join(__dirname, './database.db');
console.log(`Using database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to database successfully');
  }
});

module.exports = db; 