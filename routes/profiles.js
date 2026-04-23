import express from "express";
import { v7 as uuidv7 } from "uuid";
import Profile from "../models/Profile.js";

const router = express.Router();

function buildFilter(req) {
  const filter = {};
  const {
    gender,
    age_group,
    country_id,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability
  } = req.query;
  
  // Validation - Return error for invalid parameters
  if (gender && gender !== "male" && gender !== "female") {
    return { error: "Invalid query parameters" };
  }
  
  if (age_group && !["child", "teenager", "adult", "senior"].includes(age_group)) {
    return { error: "Invalid query parameters" };
  }
  
  if (min_age && isNaN(parseInt(min_age))) {
    return { error: "Invalid query parameters" };
  }
  
  if (max_age && isNaN(parseInt(max_age))) {
    return { error: "Invalid query parameters" };
  }
  
  if (min_gender_probability && isNaN(parseFloat(min_gender_probability))) {
    return { error: "Invalid query parameters" };
  }
  
  if (min_country_probability && isNaN(parseFloat(min_country_probability))) {
    return { error: "Invalid query parameters" };
  }
  
  // Apply filters
  if (gender === "male" || gender === "female") {
    filter.gender = gender;
  }
  
  if (age_group === "child" || age_group === "teenager" || age_group === "adult" || age_group === "senior") {
    filter.age_group = age_group;
  }
  
  if (country_id && country_id.length >= 2) {
    filter.country_id = country_id.toUpperCase();
  }
  
  if (min_age) {
    const val = parseInt(min_age);
    if (!isNaN(val)) {
      filter.age = { ...filter.age, $gte: val };
    }
  }
  
  if (max_age) {
    const val = parseInt(max_age);
    if (!isNaN(val)) {
      filter.age = { ...filter.age, $lte: val };
    }
  }
  
  if (min_gender_probability) {
    const val = parseFloat(min_gender_probability);
    if (!isNaN(val) && val >= 0 && val <= 1) {
      filter.gender_probability = { $gte: val };
    }
  }
  
  if (min_country_probability) {
    const val = parseFloat(min_country_probability);
    if (!isNaN(val) && val >= 0 && val <= 1) {
      filter.country_probability = { $gte: val };
    }
  }
  
  return { filter };
}

// GET /api/profiles - Filtering, Sorting, Pagination
router.get("/", async (req, res) => {
  try {
    const result = buildFilter(req);
    
    if (result.error) {
      return res.status(422).json({
        status: "error",
        message: result.error
      });
    }
    
    const filter = result.filter;
    
    // Sorting
    const sort_by = req.query.sort_by;
    const order = req.query.order;
    
    let sortObj = { created_at: -1 };
    
    if (sort_by === "age") {
      sortObj = { age: order === "asc" ? 1 : -1 };
    } else if (sort_by === "created_at") {
      sortObj = { created_at: order === "asc" ? 1 : -1 };
    } else if (sort_by === "gender_probability") {
      sortObj = { gender_probability: order === "asc" ? 1 : -1 };
    }
    
    // Pagination
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;
    
    const skip = (page - 1) * limit;
    
    const total = await Profile.countDocuments(filter);
    const profiles = await Profile.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);
    
    const data = profiles.map(p => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
      created_at: p.created_at,
      gender_probability: p.gender_probability
    }));
    
    // Pagination envelope - all fields must be numbers
    return res.status(200).json({
      status: "success",
      page: page,
      limit: limit,
      total: total,
      data: data
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// GET /api/profiles/search - Natural Language Query
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    
    if (!q || q.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Query parameter 'q' is required"
      });
    }
    
    const query = q.toLowerCase().trim();
    const filter = {};
    
    // Gender detection
    if (query.includes("male") || query.includes("men") || query.includes("boys") || query.includes("guys")) {
      filter.gender = "male";
    }
    if (query.includes("female") || query.includes("women") || query.includes("girls") || query.includes("ladies")) {
      filter.gender = "female";
    }
    
    // Age group detection
    if (query.includes("child") || query.includes("children") || query.includes("kid") || query.includes("kids")) {
      filter.age_group = "child";
    }
    if (query.includes("teen") || query.includes("teenager") || query.includes("adolescent") || query.includes("youth")) {
      filter.age_group = "teenager";
    }
    if (query.includes("adult") || query.includes("grown")) {
      filter.age_group = "adult";
    }
    if (query.includes("senior") || query.includes("elder") || query.includes("old") || query.includes("aged")) {
      filter.age_group = "senior";
    }
    
    // Young keyword (ages 16-24)
    if (query.includes("young")) {
      filter.age = { $gte: 16, $lte: 24 };
    }
    
    // Age above detection
    const aboveMatch = query.match(/(?:above|over|older than|greater than)\s+(\d+)/);
    if (aboveMatch) {
      filter.age = { ...filter.age, $gte: parseInt(aboveMatch[1]) };
    }
    
    // Age below detection
    const belowMatch = query.match(/(?:below|under|younger than|less than)\s+(\d+)/);
    if (belowMatch) {
      filter.age = { ...filter.age, $lte: parseInt(belowMatch[1]) };
    }
    
    // Country detection
    const countryMap = {
      "nigeria": "NG", "ngeria": "NG", "naija": "NG",
      "kenya": "KE", "kenyan": "KE",
      "south africa": "ZA", "south african": "ZA",
      "ghana": "GH", "ghanian": "GH",
      "angola": "AO", "angolan": "AO",
      "egypt": "EG", "egyptian": "EG",
      "morocco": "MA", "moroccan": "MA",
      "ethiopia": "ET", "ethiopian": "ET",
      "tanzania": "TZ", "tanzanian": "TZ",
      "uganda": "UG", "ugandan": "UG",
      "cameroon": "CM", "cameroonian": "CM",
      "usa": "US", "america": "US", "united states": "US",
      "uk": "GB", "united kingdom": "GB", "britain": "GB",
      "canada": "CA", "canadian": "CA"
    };
    
    for (const [countryName, countryCode] of Object.entries(countryMap)) {
      if (query.includes(countryName)) {
        filter.country_id = countryCode;
        break;
      }
    }
    
    // From/in detection for country
    const fromMatch = query.match(/(?:from|in)\s+([a-z\s]+)/);
    if (fromMatch && !filter.country_id) {
      const location = fromMatch[1].trim();
      for (const [countryName, countryCode] of Object.entries(countryMap)) {
        if (location.includes(countryName)) {
          filter.country_id = countryCode;
          break;
        }
      }
    }
    
    // If no filters found, return error
    if (Object.keys(filter).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Unable to interpret query"
      });
    }
    
    // Pagination for search results
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;
    
    const skip = (page - 1) * limit;
    const total = await Profile.countDocuments(filter);
    const profiles = await Profile.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);
    
    const data = profiles.map(p => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id
    }));
    
    return res.status(200).json({
      status: "success",
      page: page,
      limit: limit,
      total: total,
      data: data
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// GET /api/profiles/:id - Get by ID
router.get("/:id", async (req, res) => {
  try {
    const profile = await Profile.findOne({ id: req.params.id });
    
    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }
    
    return res.status(200).json({
      status: "success",
      data: profile
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// POST /api/profiles - Create profile
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Name is required"
      });
    }
    
    if (typeof name !== "string") {
      return res.status(422).json({
        status: "error",
        message: "Name must be a string"
      });
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    // Check for existing profile (idempotency)
    const existing = await Profile.findOne({ name: normalizedName });
    
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: existing
      });
    }
    
    // Create new profile
    const profile = new Profile({
      id: uuidv7(),
      name: normalizedName,
      gender: req.body.gender,
      gender_probability: req.body.gender_probability,
      age: req.body.age,
      age_group: req.body.age_group,
      country_id: req.body.country_id,
      country_name: req.body.country_name,
      country_probability: req.body.country_probability,
      created_at: new Date()
    });
    
    await profile.save();
    
    return res.status(201).json({
      status: "success",
      data: profile
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// DELETE /api/profiles/:id - Delete profile
router.delete("/:id", async (req, res) => {
  try {
    const result = await Profile.findOneAndDelete({ id: req.params.id });
    
    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }
    
    return res.status(204).send();
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

export default router;