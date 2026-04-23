// save as fix-fields.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Profile from "./models/Profile.js";

dotenv.config();

async function fixFields() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Add missing created_at and gender_probability to existing records
  const result = await Profile.updateMany(
    { created_at: { $exists: false } },
    { $set: { created_at: new Date() } }
  );
  
  const result2 = await Profile.updateMany(
    { gender_probability: { $exists: false } },
    { $set: { gender_probability: 0.5 } }
  );
  
  console.log(`Updated ${result.modifiedCount} records with created_at`);
  console.log(`Updated ${result2.modifiedCount} records with gender_probability`);
  process.exit(0);
}

fixFields();