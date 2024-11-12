const express = require("express");
const http = require("http");
const { initializeAPI } = require("./api");

// Create the express server
const app = express();
app.use(express.json());
const server = http.createServer(app);

// deliver static files from the client folder like css, js, images
app.use(express.static("client"));
// route for the homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

//route for the login page
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/client/login.html");
});

// Initialize the REST api
initializeAPI(app);

//start the web server
const serverPort = process.env.PORT || 3001;
server.listen(serverPort, () => {
  console.log(`Express Server started on port ${serverPort}`);
});
