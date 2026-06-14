import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import volunteerRoutes from "./routes/volunteerRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

dotenv.config();

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/volunteers", volunteerRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/stats", statsRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "NayePankh Volunteer API is running",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
