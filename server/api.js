const fs = require("fs");
const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
let db;

const SECRET_KEY = process.env.SECRET_KEY || "your_super_secret_key";

// Function to escape potentially dangerous characters
const escapeCode = (str) => {
  if (!str) return ""; // Return an empty string if str is null or undefined
  return str.replace(/[&<>"']/g, (match) => {
    const escapeChars = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return escapeChars[match];
  });
};

// Logging function for user activity
const logUserActivity = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());

  fs.appendFile("user-activity_logs.txt", logEntry, (err) => {
    if (err) console.error("Failed to write to user-activity_logs.txt:", err);
  });
};

// Logging function for server errors
const logServerError = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ERROR: ${message}\n`;
  console.error(logEntry.trim());

  fs.appendFile("server_logs.txt", logEntry, (err) => {
    if (err) console.error("Failed to write to server_logs.txt:", err);
  });
};

// Rate limiter to prevent brute-force attempts
const visitLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: {
    error: "Further Requests Blocked, Too many Requests sent. Try again later.",
  },
});

// Initialize the API with database and routes
const initializeAPI = async (app) => {
  try {
    db = await initializeDatabase();
  } catch (error) {
    logServerError("Database initialization failed: " + error.message);
  }

  app.post("/api/login", visitLimit, login);
  app.get("/api/feed", authenticateToken, getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
};

// Authentication function to generate token upon login
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = `SELECT * FROM users WHERE username = ?`;
    const user = await queryDB(db, query, [username]);

    if (user.length === 1) {
      const validPassword = await bcrypt.compare(password, user[0].password);
      if (validPassword) {
        const token = jwt.sign(
          { userId: user[0].id, username: user[0].username },
          SECRET_KEY,
          { expiresIn: "1h" }
        );
        logUserActivity(`Login successful for user: ${username}`);
        return res.json({ token, username: user[0].username });
      }
    }

    logUserActivity(`Failed login attempt for username: ${username}`);
    return res.status(401).json({ message: "Invalid credentials" });
  } catch (error) {
    logServerError(`Error during login for user ${username}: ${error.message}`);
    return res.status(500).json({ message: "An error occurred during login" });
  }
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      logServerError("Token verification failed: " + err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Fetches tweets from the database
const getFeed = async (req, res) => {
  const query = req.query.q || "";

  let sqlQuery = "SELECT * FROM tweets ORDER BY id DESC";
  if (query) {
    sqlQuery = `SELECT * FROM tweets WHERE text LIKE ? ORDER BY id DESC`;
  }

  try {
    const tweets = await queryDB(db, sqlQuery, query ? [`%${query}%`] : []);

    // Sanitize tweet text before sending it in response
    const sanitizedTweets = tweets.map((tweet) => ({
      ...tweet,
      text: escapeCode(tweet.text), // Escape the tweet text
    }));

    logUserActivity(`User: ${req.user.username} fetched the tweets`);
    res.json(sanitizedTweets);
  } catch (error) {
    logServerError(
      `Failed to fetch tweets for user ${req.user.username}: ${error.message}`
    );
    res.status(500).json({ message: "Error fetching tweets" });
  }
};

// Route handler to post a tweet
const postTweet = async (req, res) => {
  const { text } = req.body;
  const username = req.user.username;
  const timestamp = new Date().toISOString();

  try {
    // Escape the tweet text to prevent XSS vulnerabilities
    const sanitizedText = escapeCode(text);

    const sqlQuery =
      "INSERT INTO tweets (username, timestamp, text) VALUES (?, ?, ?)";
    await queryDB(db, sqlQuery, [username, timestamp, sanitizedText]);
    logUserActivity(`User ${username} posted a new tweet: "${sanitizedText}"`);
    res.status(201).json({ message: "Tweet posted successfully" });
  } catch (error) {
    logServerError(
      `Failed to post tweet for user ${username}: ${error.message}`
    );
    res.status(500).json({ message: "Error posting tweet" });
  }
};

module.exports = { initializeAPI };
