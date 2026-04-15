import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import profileRoutes from "./routes/profiles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());


// MongoDB connection
await mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB', error));

// Routes
app.use("/api/profiles", profileRoutes);


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