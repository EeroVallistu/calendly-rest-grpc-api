const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the database from the root folder
const rootDbPath = path.join(__dirname, '../database.db');
console.log(`Using database at: ${rootDbPath}`);
const db = new sqlite3.Database(rootDbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to database successfully');
  }
});

module.exports = db; 