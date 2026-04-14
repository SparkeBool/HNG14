import express from "express";
import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import Profile from "../models/Profile.js";

const router = express.Router();
console.log("5. Profiles route file loaded");
// Helper: Determine age group
function getAgeGroup(age) {
  if (age >= 0 && age <= 12) return "child";
  if (age >= 13 && age <= 19) return "teenager";
  if (age >= 20 && age <= 59) return "adult";
  if (age >= 60) return "senior";
  return null;
}

// Helper: Validate name
function validateName(name) {
  if (name === undefined || name === null || name === "") {
    return { valid: false, status: 400, message: "Name parameter is required and cannot be empty" };
  }
  if (typeof name !== "string") {
    return { valid: false, status: 422, message: "Name must be a string" };
  }
  return { valid: true };
}

// POST /api/profiles
router.post("/", async (req, res) => {
    console.log("6. POST /api/profiles route was called"); 
  try {
    const { name } = req.body;

    // 1. Input validation
    const validation = validateName(name);
    if (!validation.valid) {
      return res.status(validation.status).json({
        status: "error",
        message: validation.message
      });
    }

    const normalizedName = name.toLowerCase().trim();

    // 2. Idempotency check
    const existingProfile = await Profile.findOne({ name: normalizedName });
    if (existingProfile) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: {
          id: existingProfile.id,
          name: existingProfile.name,
          gender: existingProfile.gender,
          gender_probability: existingProfile.gender_probability,
          sample_size: existingProfile.sample_size,
          age: existingProfile.age,
          age_group: existingProfile.age_group,
          country_id: existingProfile.country_id,
          country_probability: existingProfile.country_probability,
          created_at: existingProfile.created_at.toISOString()
        }
      });
    }

    // 3. Call external APIs in parallel
    const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
      axios.get(`https://api.genderize.io/?name=${encodeURIComponent(normalizedName)}`, { timeout: 15000 }),
      axios.get(`https://api.agify.io/?name=${encodeURIComponent(normalizedName)}`, { timeout: 15000 }),
      axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(normalizedName)}`, { timeout: 15000 })
    ]);

    const genderData = genderizeRes.data;
    const ageData = agifyRes.data;
    const countryData = nationalizeRes.data;

    // 4. Edge case checks
    if (genderData.gender === null || genderData.count === 0) {
      return res.status(400).json({
        status: "error",
        message: "Genderize: No prediction available for this name"
      });
    }

    if (ageData.age === null) {
      return res.status(400).json({
        status: "error",
        message: "Agify: No age prediction available for this name"
      });
    }

    if (!countryData.country || countryData.country.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Nationalize: No country prediction available for this name"
      });
    }

    // 5. Process data
    const sample_size = genderData.count;
    const age_group = getAgeGroup(ageData.age);
    const topCountry = countryData.country.reduce((prev, current) => 
      (prev.probability > current.probability) ? prev : current
    );

    // 6. Create record with UUID v7
    const newProfile = new Profile({
      id: uuidv7(),
      name: normalizedName,
      gender: genderData.gender,
      gender_probability: genderData.probability,
      sample_size: sample_size,
      age: ageData.age,
      age_group: age_group,
      country_id: topCountry.country_id,
      country_probability: topCountry.probability,
      created_at: new Date()
    });

    await newProfile.save();

    // 7. Return success response
    return res.status(201).json({
      status: "success",
      data: {
        id: newProfile.id,
        name: newProfile.name,
        gender: newProfile.gender,
        gender_probability: newProfile.gender_probability,
        sample_size: newProfile.sample_size,
        age: newProfile.age,
        age_group: newProfile.age_group,
        country_id: newProfile.country_id,
        country_probability: newProfile.country_probability,
        created_at: newProfile.created_at.toISOString()
      }
    });

  } catch (error) {
    console.error("Server error:", error);
    
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return res.status(502).json({
        status: "error",
        message: "External API service unavailable"
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

export default router;