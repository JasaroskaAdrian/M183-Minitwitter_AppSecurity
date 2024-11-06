const { initializeDatabase, queryDB, insertDB } = require("./database");
const { jwt }  = require("jsonwebtoken")
let db;
//Secret Key produced by my own Ubuntu Container in Docker, -> openssl rand -base64 32
const secretKey = process.env.secretKey || "super_secret_key_for_jwt_authentication"

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", verifyToken, getFeed);
  app.post("/api/feed", verifyToken, postTweet);
  app.post("/api/login", login);
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log("Authorization Header:", authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    console.log("Decoded token:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
const getFeed = async (req, res) => {
  const query = req.query.q;
  const tweets = await queryDB(db, query);
  res.json(tweets);
};

const postTweet = (req, res) => {
  insertDB(db, req.body.query);
  res.json({ status: "ok" });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  
  // Use a parameterized query to prevent SQL injection
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  const user = await queryDB(db, query, [username, password]);
  
  if (user.length === 1) {
    // Generates JWT Token with an Hour Expiration
    const token = jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        data: username
      },
      secretKey
    );
    // Sends the user data and token as a Response
    res.json({
      user: user[0],
      token: token
    });
  } else {
    // If Auth fails, then a null Response will be sent
    res.json(null);
  }
};



module.exports = { initializeAPI };
