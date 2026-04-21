import mongoose from "mongoose";
import dotenv from "dotenv";
import { v7 as uuidv7 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Profile from "../models/Profile.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Read JSON file
    const profilesPath = path.join(__dirname, "data", "profiles.json");
    const fileContent = fs.readFileSync(profilesPath, "utf-8");
    const profilesData = JSON.parse(fileContent);
    const profiles = profilesData.profiles;

    console.log(`Found ${profiles.length} profiles to process`);

    // Filter out existing profiles
    const existingProfiles = await Profile.find({}, "name");
    const existingNames = new Set(existingProfiles.map(p => p.name));
    
    const newProfiles = profiles.filter(item => !existingNames.has(item.name.toLowerCase()));
    
    console.log(`${newProfiles.length} new profiles to insert, ${existingNames.size} already exist`);

    if (newProfiles.length === 0) {
      console.log("No new profiles to seed");
      process.exit(0);
    }

    // Prepare bulk insert data
    const profilesToInsert = newProfiles.map(item => ({
      id: uuidv7(),
      name: item.name.toLowerCase(),
      gender: item.gender,
      gender_probability: item.gender_probability,
      age: item.age,
      age_group: item.age_group,
      country_id: item.country_id,
      country_name: item.country_name,
      country_probability: item.country_probability,
      created_at: new Date()
    }));

    // Bulk insert (much faster)
    const result = await Profile.insertMany(profilesToInsert, { ordered: false });
    
    console.log(`Seeding complete: ${result.length} profiles inserted`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seedDatabase();