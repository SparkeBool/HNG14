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
  
  // VALIDATION - Return 422 for invalid parameters
  if (gender && gender !== "male" && gender !== "female") {
    throw new Error("Invalid query parameters");
  }
  
  if (age_group && !["child", "teenager", "adult", "senior"].includes(age_group)) {
    throw new Error("Invalid query parameters");
  }
  
  if (min_age && isNaN(parseInt(min_age))) {
    throw new Error("Invalid query parameters");
  }
  
  if (max_age && isNaN(parseInt(max_age))) {
    throw new Error("Invalid query parameters");
  }
  
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
    if (!isNaN(val)) filter.age = { ...filter.age, $gte: val };
  }
  
  if (max_age) {
    const val = parseInt(max_age);
    if (!isNaN(val)) filter.age = { ...filter.age, $lte: val };
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
  
  return filter;
}

// GET /api/profiles
router.get("/", async (req, res) => {
  try {
    let filter;
    try {
      filter = buildFilter(req);
    } catch (error) {
      return res.status(422).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }
    
    // Handle sorting
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
    
    res.status(200).json({
      status: "success",
      page: page,
      limit: limit,
      total: total,
      data: data
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// Natural language search
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
    
    // Gender
    if (query.includes("male") || query.includes("men") || query.includes("boys")) {
      filter.gender = "male";
    }
    if (query.includes("female") || query.includes("women") || query.includes("girls")) {
      filter.gender = "female";
    }
    
    // Age group
    if (query.includes("child") || query.includes("children") || query.includes("kid")) {
      filter.age_group = "child";
    }
    if (query.includes("teen") || query.includes("teenager")) {
      filter.age_group = "teenager";
    }
    if (query.includes("adult")) {
      filter.age_group = "adult";
    }
    if (query.includes("senior") || query.includes("elder") || query.includes("old")) {
      filter.age_group = "senior";
    }
    
    // Young
    if (query.includes("young")) {
      filter.age = { $gte: 16, $lte: 24 };
    }
    
    // Age above/below
    const aboveMatch = query.match(/(?:above|over|older than)\s+(\d+)/);
    if (aboveMatch) {
      filter.age = { ...filter.age, $gte: parseInt(aboveMatch[1]) };
    }
    
    const belowMatch = query.match(/(?:below|under|younger than)\s+(\d+)/);
    if (belowMatch) {
      filter.age = { ...filter.age, $lte: parseInt(belowMatch[1]) };
    }
    
    // Country
    const countries = {
      "nigeria": "NG", "kenya": "KE", "south africa": "ZA",
      "ghana": "GH", "angola": "AO", "egypt": "EG",
      "usa": "US", "america": "US", "united states": "US",
      "uk": "GB", "canada": "CA"
    };
    
    for (const [name, code] of Object.entries(countries)) {
      if (query.includes(name)) {
        filter.country_id = code;
        break;
      }
    }
    
    if (Object.keys(filter).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Unable to interpret query"
      });
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
    
    res.status(200).json({
      status: "success",
      page: page,
      limit: limit,
      total: total,
      data: data
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// GET by ID
router.get("/:id", async (req, res) => {
  try {
    const profile = await Profile.findOne({ id: req.params.id });
    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }
    res.status(200).json({
      status: "success",
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// POST
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Name is required"
      });
    }
    
    const normalizedName = name.toLowerCase().trim();
    const existing = await Profile.findOne({ name: normalizedName });
    
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: existing
      });
    }
    
    const profile = new Profile({
      id: uuidv7(),
      ...req.body,
      name: normalizedName,
      created_at: new Date()
    });
    
    await profile.save();
    
    res.status(201).json({
      status: "success",
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// DELETE - Fixed for PowerShell
router.delete("/:id", async (req, res) => {
  try {
    const result = await Profile.findOneAndDelete({ id: req.params.id });
    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

export default router;