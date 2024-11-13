const express = require("express");
const http = require("http");
const fs = require("fs");
const { initializeAPI } = require("./api");

// Define the logging middleware
const logs = (req, res, next) => {
  const ignorePaths = ['/styles.css', '/scripts/index.js', '/scripts/login.js', '/img/tweet.png', '/api/feed', '/', '/login.html', '/api/login', 'favicon.ico', '/api/logout'];
  if (ignorePaths.includes(req.path)) return next(); // Skip logging

  const timestamp = new Date().toISOString();
  const user = req.user ? req.user.username : "Unauthenticated User";
  
  // Temporarily capture the original `end` method of the response
  const originalEnd = res.end;
  
  // Override the response `end` method to log the status after the response has been completed
  res.end = function(...args) {
    const logEntry = `[${timestamp}] User: ${user}, Method: ${req.method}, URL: ${req.originalUrl}, Status: ${res.statusCode}\n`;
    console.log(logEntry.trim());

    fs.appendFile("server_logs.txt", logEntry, (err) => {
      if (err) console.error("Failed to write log:", err);
    });

    // Call the original `end` method to complete the response
    originalEnd.apply(res, args);
  };
  
  next();
};

// Creation of the express server
const app = express();
app.use(express.json());

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

// Start the web server
const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
server.listen(serverPort, () => {
  console.log(`Express Server started on port ${serverPort}`);
});
