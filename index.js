import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import profileRoutes from "./routes/profiles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
console.log("1. Index.js loaded");

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
console.log("2. Middleware configured");

// MongoDB connection
await mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB', error));

// Routes
app.use("/api/profiles", profileRoutes);
console.log("3. Routes registered at /api/profiles");

// Health check
app.get("/", (req, res) => {
  res.json({ message: "API is running. Use POST /api/profiles with { name: 'yourname' }" });
});

// Start server (for local development)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📍 POST http://localhost:${PORT}/api/profiles`);
});

// Export for Vercel serverless
export default app;