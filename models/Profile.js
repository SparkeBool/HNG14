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
  gender: {
    type: String,
    enum: ["male", "female"]
  },
  gender_probability: {
    type: Number,
    min: 0,
    max: 1
  },
  age: {
    type: Number,
    min: 0
  },
  age_group: {
    type: String,
    enum: ["child", "teenager", "adult", "senior"]
  },
  country_id: {
    type: String,
    uppercase: true,
    length: 2
  },
  country_name: String,
  country_probability: {
    type: Number,
    min: 0,
    max: 1
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

profileSchema.index({ gender: 1 });
profileSchema.index({ age_group: 1 });
profileSchema.index({ country_id: 1 });
profileSchema.index({ age: 1 });
profileSchema.index({ created_at: -1 });
profileSchema.index({ gender_probability: -1 });
profileSchema.index({ country_probability: -1 });

export default mongoose.model("Profile", profileSchema);