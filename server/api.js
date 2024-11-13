const fs = require("fs");
const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const rateLimit = require('express-rate-limit');
let db;

const SECRET_KEY = process.env.SECRET_KEY || "your_super_secret_key";

// Logging function for all user activity
const logActivity = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  // Logs to console and writes to server_logs.txt
  console.log(logEntry.trim());
  fs.appendFile("server_logs.txt", logEntry, (err) => {
    //If it fails then tells me that it failed and what happened
    if (err) console.error("Failed to write log:", err);
  });
};

// Rate limiter to prevent brute-force attempts
const visitLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: 'Further Requests Blocked, Too many Requests sent. Try again later.' },
}); //Status Code 429

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  
  app.post("/api/login", visitLimit, login);
  app.post("/api/logout", authenticateToken, logout);

  // Fetch tweets with authentication Check Middleware
  app.get("/api/feed", authenticateToken, getFeed);

  // Post a tweet with authentication Check Middleware
  app.post("/api/feed", authenticateToken, postTweet);
};

// Authentication function to generate token upon login
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = `SELECT * FROM users WHERE username = ?`;
    const user = await queryDB(db, query, [username]);

    if (user.length === 1) {
      // Check if the password matches, compares the password in the userinput with the one in the db
      const validPassword = await bcrypt.compare(password, user[0].password);
      console.log(`User found: ${username}, Password valid: ${validPassword}`);

      if (validPassword) {
        const token = jwt.sign({ userId: user[0].id, username: user[0].username }, SECRET_KEY, { expiresIn: '1h' });
        logActivity(`Login successful for user: ${username}`);
        return res.json({ token, username: user[0].username });
      }
    }

    logActivity(`Failed login attempt for username: ${username}`);
    return res.status(401).json({ message: "Invalid credentials" });
    
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "An error occurred during login" });
  }
};

// Logout route handler, for whatever reason the log to this isnt working at the moment
const logout = (req, res) => {
  const username = req.user.username;
  logActivity(`Logout for user: ${username}`);
  res.status(200).json({ message: "Logged out successfully" });
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401); // No token, unauthorized

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token, forbidden
    req.user = user; 
    next(); 
  });
};

// Fetches tweets from the database
const getFeed = async (req, res) => {
  const query = req.query.q || '';  // Default to an empty string if no query is provided

  let sqlQuery = "SELECT * FROM tweets ORDER BY id DESC";
  if (query) {
    sqlQuery = `SELECT * FROM tweets WHERE text LIKE ? ORDER BY id DESC`;
  }

  try {
    const tweets = await queryDB(db, sqlQuery, query ? [`%${query}%`] : []); //LIKE Statement in SQL Syntax, wie oben bei const sqlquery
    res.json(tweets);
  } catch (error) {
    console.error("Failed to fetch tweets:", error);
    res.status(500).json({ message: "Error fetching tweets" });
    
  }
};

// Route handler to post a tweet (protected)
const postTweet = async (req, res) => {
  const { text } = req.body;
  const username = req.user.username;
  const timestamp = new Date().toISOString();

  try {
    const sqlQuery = "INSERT INTO tweets (username, timestamp, text) VALUES (?, ?, ?)";
    await queryDB(db, sqlQuery, [username, timestamp, text]);
    res.status(201).json({ message: "Tweet posted successfully" }); //CREATED 201, POST is Successful and Ressource got created
  } catch (error) {
    console.error("Failed to post tweet:", error);
    res.status(500).json({ message: "Error posting tweet" }); //Just throw a Internal Server Error, because why not
  }
};

module.exports = { initializeAPI };
