import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  gender: String,
  gender_probability: Number,
  sample_size: Number,
  age: Number,
  age_group: {
    type: String,
    enum: ["child", "teenager", "adult", "senior"]
  },
  country_id: String,
  country_probability: Number,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

export default mongoose.model("Profile", profileSchema);