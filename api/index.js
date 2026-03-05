const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const authRoutes = require("../routes/authRoutes");
const attendanceRoutes = require("../routes/attendanceRoutes");

dotenv.config();

const app = express();

// Connect to DB on each request (cached — only opens one real connection).
// This is the correct serverless pattern; avoids connecting at module load
// time where env vars might not yet be available.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err.message);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use(
  cors({
    // Allow the Vercel deployment URL and localhost
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
      : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Export for Vercel / Next.js API route — do NOT call app.listen()
module.exports = app;
