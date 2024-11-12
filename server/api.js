const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
let db;

const SECRET_KEY = process.env.SECRET_KEY || "your_super_secret_key"; // Define the secret key

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  
  
  app.post("/api/login", login);

  // Protected routes with authentication middleware
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
      // Check if the password matches
      const validPassword = await bcrypt.compare(password, user[0].password);
      console.log(`User found: ${username}, Password valid: ${validPassword}`);

      if (validPassword) {
        const token = jwt.sign({ userId: user[0].id }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ token, username: user[0].username }); //response for both the token and username of the user <3
      }
    }

    // If login fails (user not found or invalid password), send a single 401 response
    console.log("Invalid credentials");
    return res.status(401).json({ message: "Invalid credentials" });
    
  } catch (error) {
    console.error("Error during login:", error);
    // Send a single 500 response if an error occurs
    return res.status(500).json({ message: "An error occurred during login" }); //-> Internal Server error, thought i might add this because i want to try and get as comfortable as possible with the uses of Status Codes <3
  }
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
