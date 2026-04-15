import express from "express";
import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import Profile from "../models/Profile.js";

const router = express.Router();

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

// ==================== 1. POST /api/profiles ====================
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    // Input validation
    const validation = validateName(name);
    if (!validation.valid) {
      return res.status(validation.status).json({
        status: "error",
        message: validation.message
      });
    }

    const normalizedName = name.toLowerCase().trim();

    // Idempotency check
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

    // Call external APIs in parallel
    const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
      axios.get(`https://api.genderize.io/?name=${encodeURIComponent(normalizedName)}`, { timeout: 10000 }),
      axios.get(`https://api.agify.io/?name=${encodeURIComponent(normalizedName)}`, { timeout: 10000 }),
      axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(normalizedName)}`, { timeout: 10000 })
    ]);

    const genderData = genderizeRes.data;
    const ageData = agifyRes.data;
    const countryData = nationalizeRes.data;

    // Edge case checks - Return 502 with status as string "502"
    if (genderData.gender === null || genderData.count === 0) {
      return res.status(502).json({
        status: "502",
        message: "Genderize returned an invalid response"
      });
    }

    if (ageData.age === null) {
      return res.status(502).json({
        status: "502",
        message: "Agify returned an invalid response"
      });
    }

    if (!countryData.country || countryData.country.length === 0) {
      return res.status(502).json({
        status: "502",
        message: "Nationalize returned an invalid response"
      });
    }

    // Process data
    const sample_size = genderData.count;
    const age_group = getAgeGroup(ageData.age);
    const topCountry = countryData.country.reduce((prev, current) => 
      (prev.probability > current.probability) ? prev : current
    );

    // Create record with UUID v7
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

    // Return success response (201 Created)
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
        status: "502",
        message: "External API service unavailable"
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// ==================== 2. GET /api/profiles/{id} ====================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const profile = await Profile.findOne({ id: id });
    
    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }
    
    // Returns FULL profile with all fields
    return res.status(200).json({
      status: "success",
      data: {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        sample_size: profile.sample_size,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_probability: profile.country_probability,
        created_at: profile.created_at.toISOString()
      }
    });
    
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// ==================== 3. GET /api/profiles (with filters) ====================
router.get("/", async (req, res) => {
  try {
    const { gender, country_id, age_group } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (gender) {
      filter.gender = gender.toLowerCase();
    }
    
    if (country_id) {
      filter.country_id = country_id.toUpperCase();
    }
    
    if (age_group) {
      filter.age_group = age_group.toLowerCase();
    }
    
    // Query database
    const profiles = await Profile.find(filter).sort({ created_at: -1 });
    
    // Returns SIMPLIFIED data array (only 6 fields as required)
    const dataArray = profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      gender: profile.gender,
      age: profile.age,
      age_group: profile.age_group,
      country_id: profile.country_id
    }));
    
    return res.status(200).json({
      status: "success",
      count: dataArray.length,
      data: dataArray
    });
    
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// ==================== 4. DELETE /api/profiles/{id} ====================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Profile.findOneAndDelete({ id: id });
    
    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }
    
    // Returns 204 No Content with NO body
    return res.status(204).send();
    
  } catch (error) {
    console.error("Error deleting profile:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

export default router;