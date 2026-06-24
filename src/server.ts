require('dotenv').config(); // Load environment variables from .env
const app = require('./app');
const http = require('http');

const connetDataBase = require('./config/db');
const mongoose = require("mongoose");
const server = http.createServer(app);

// Start server on the specified port
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

connetDataBase()
  .then((res: any) => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    });
  })
  .catch((err: any) => {
    console.log("err", err);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  try {
    await mongoose?.connection?.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("Error closing MongoDB connection:", err);
    process.exit(1);
  }
});

export { };
