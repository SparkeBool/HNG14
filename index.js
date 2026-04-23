import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import profileRoutes from "./routes/profiles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/profiles", profileRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Intelligence Query Engine API",
    endpoints: {
      getAll: "GET /api/profiles?gender=&age_group=&country_id=&min_age=&max_age=&sort_by=&order=&page=&limit=",
      search: "GET /api/profiles/search?q=young males from nigeria",
      getById: "GET /api/profiles/{id}",
      create: "POST /api/profiles",
      delete: "DELETE /api/profiles/{id}"
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;