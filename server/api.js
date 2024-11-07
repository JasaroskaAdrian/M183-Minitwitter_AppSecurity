const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
let db;

const SECRET_KEY = process.env.SECRET_KEY || "your_super_secret_key"; // Define the secret key

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  
  // Public route: login
  app.post("/api/login", login);

  // Protected routes with authentication middleware
  app.get("/api/feed", authenticateToken, getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
};

// Authentication function to generate token upon login
const login = async (req, res) => {
  const { username, password } = req.body;

  // Query database for user with the provided username and password
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  const user = await queryDB(db, query, [username, password]);

  if (user.length === 1) {
    const token = jwt.sign({ userId: user[0].id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401); // No token, unauthorized

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token, forbidden
    req.user = user; // Attach decoded user info to the request
    next(); // Continue to the next middleware or route handler
  });
};

// Route handler to get feed (protected)
const getFeed = async (req, res) => {
  const query = req.query.q;
  const tweets = await queryDB(db, query);
  res.json(tweets);
};

// Route handler to post a tweet (protected)
const postTweet = (req, res) => {
  insertDB(db, req.body.query);
  res.json({ status: "ok" });
};

module.exports = { initializeAPI };
