const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const saltRounds = 10;

const tweetsTableExists =
  "SELECT name FROM sqlite_master WHERE type='table' AND name='tweets'";
const createTweetsTable = `CREATE TABLE tweets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  timestamp TEXT,
  text TEXT
)`;
const usersTableExists =
  "SELECT name FROM sqlite_master WHERE type='table' AND name='users'";
const createUsersTable = `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT
)`;

// Function to seed the users table with hashed passwords
const seedUsersTable = async (db) => {
  const users = [
    { username: 'switzerchees', password: '123456' },
    { username: 'john', password: '123456' },
    { username: 'jane', password: '123456' },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [user.username, hashedPassword], (err) => {
      if (err) console.error(err.message);
    });
  }
};

// Call this function inside your database initialization code
// after creating the `users` table


// Initialize the database, creating tables if they don't exist
const initializeDatabase = async () => {
  const db = new sqlite3.Database("./minitwitter.db");

  db.serialize(() => {
    // Check and create tweets table
    db.get(tweetsTableExists, [], async (err, row) => {
      if (err) return console.error(err.message);
      if (!row) {
        db.run(createTweetsTable);
      }
    });

    // Check and create users table, then seed it if it doesn't exist
    db.get(usersTableExists, [], async (err, row) => {
      if (err) return console.error(err.message);
      if (!row) {
        db.run(createUsersTable, [], async (err) => {
          if (err) return console.error(err.message);
          await seedUsersTable(db); // Seed with hashed passwords
        });
      }
    });
  });

  return db;
};

// Insert query function
const insertDB = (db, query) => {
  return new Promise((resolve, reject) => {
    db.run(query, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

// Select query function
const queryDB = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports = { initializeDatabase, queryDB, insertDB };
