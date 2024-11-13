const express = require("express");
const http = require("http");
const fs = require("fs");
const { initializeAPI } = require("./api");

// Creation of the express server
const app = express();
app.use(express.json());

// Global middleware to remove X-Powered-By header
app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
});

// Define the logging middleware
const logs = (req, res, next) => {
  const ignorePaths = [
    "/styles.css",
    "/scripts/index.js",
    "/scripts/login.js",
    "/img/tweet.png",
    "/api/feed",
    "/",
    "/login.html",
    "/api/login",
    "favicon.ico",
  ];
  if (ignorePaths.includes(req.path)) return next(); // Skip logging

  const timestamp = new Date().toISOString();
  const user = req.user ? req.user.username : "Unauthenticated User";

  const logEntry = `[${timestamp}] User: ${user}, Method: ${req.method}, URL: ${req.originalUrl}, Status: ${res.statusCode}\n`;
  console.log(logEntry.trim());

  fs.appendFile("server_logs.txt", logEntry, (err) => {
    if (err) console.error("Failed to write log:", err);
  });

  next();
};

// Apply logging middleware
app.use(logs);

// Serve static files
app.use(express.static("client"));

// Routes for the homepage and login page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/client/login.html");
});

// Initialize the REST API routes
initializeAPI(app);

// Global error-handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Error: ${err.message}\n`;

  // Log the error to the console
  console.error(logEntry.trim());

  // Append the error to server_logs.txt
  fs.appendFile("server_logs.txt", logEntry, (fsErr) => {
    if (fsErr) console.error("Failed to write error log:", fsErr);
  });

  // Send a generic error response
  res.status(500).json({ message: "An internal server error occurred." });
});

// Start the web server
const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
server.listen(serverPort, () => {
  console.log(`Express Server started on port ${serverPort}`);
});
