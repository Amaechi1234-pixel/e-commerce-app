const path = require("path");
const fs = require("fs");
const https = require("https");
const mongoose = require("mongoose");
require("dotenv").config();

const app = require("./app");

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3001;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    const keyPath = path.join(__dirname, "server.key");
    const certPath = path.join(__dirname, "server.cert");

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const privateKey = fs.readFileSync(keyPath);
      const certificate = fs.readFileSync(certPath);
      https.createServer({ key: privateKey, cert: certificate }, app).listen(PORT, () => {
        console.log(`Server is running on https://localhost:${PORT}`);
      });
    } else {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });