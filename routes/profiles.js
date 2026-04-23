import express from "express";
import { v7 as uuidv7 } from "uuid";
import Profile from "../models/Profile.js";

const router = express.Router();

function parseNaturalLanguage(query) {
  const filters = {};
  
  if (!query || query.trim() === "") {
    return { error: "Unable to interpret query" };
  }
  
  const q = query.toLowerCase().trim();
  
  if (q.includes("male") || q.includes("men") || q.includes("boys")) {
    filters.gender = "male";
  }
  if (q.includes("female") || q.includes("women") || q.includes("girls")) {
    filters.gender = "female";
  }
  
  if (q.includes("child") || q.includes("children") || q.includes("kid")) {
    filters.age_group = "child";
  }
  if (q.includes("teen") || q.includes("teenager")) {
    filters.age_group = "teenager";
  }
  if (q.includes("adult")) {
    filters.age_group = "adult";
  }
  if (q.includes("senior") || q.includes("elder") || q.includes("old")) {
    filters.age_group = "senior";
  }
  
  if (q.includes("young")) {
    filters.min_age = 16;
    filters.max_age = 24;
  }
  
  const aboveMatch = q.match(/(?:above|over|older than)\s+(\d+)/);
  if (aboveMatch) {
    filters.min_age = parseInt(aboveMatch[1]);
  }
  
  const belowMatch = q.match(/(?:below|under|younger than)\s+(\d+)/);
  if (belowMatch) {
    filters.max_age = parseInt(belowMatch[1]);
  }
  
  const countryMap = {
    "nigeria": "NG", "kenya": "KE", "south africa": "ZA",
    "ghana": "GH", "angola": "AO", "egypt": "EG",
    "morocco": "MA", "ethiopia": "ET", "tanzania": "TZ",
    "uganda": "UG", "cameroon": "CM", "usa": "US",
    "america": "US", "united states": "US", "uk": "GB",
    "united kingdom": "GB", "canada": "CA"
  };
  
  for (const [name, code] of Object.entries(countryMap)) {
    if (q.includes(name)) {
      filters.country_id = code;
      break;
    }
  }
  
  const fromMatch = q.match(/(?:from|in)\s+([a-z\s]+)/);
  if (fromMatch && !filters.country_id) {
    const location = fromMatch[1].trim();
    for (const [name, code] of Object.entries(countryMap)) {
      if (location.includes(name)) {
        filters.country_id = code;
        break;
      }
    }
  }
  
  if (Object.keys(filters).length === 0) {
    return { error: "Unable to interpret query" };
  }
  
  return { filters };
}

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
  
  if (gender && (gender === "male" || gender === "female")) {
    filter.gender = gender;
  }
  
  if (age_group && ["child", "teenager", "adult", "senior"].includes(age_group)) {
    filter.age_group = age_group;
  }
  
  if (country_id && country_id.length >= 2) {
    filter.country_id = country_id.toUpperCase();
  }
  
  if (min_age) {
    const minAgeNum = parseInt(min_age);
    if (!isNaN(minAgeNum)) {
      filter.age = { ...filter.age, $gte: minAgeNum };
    }
  }
  
  if (max_age) {
    const maxAgeNum = parseInt(max_age);
    if (!isNaN(maxAgeNum)) {
      filter.age = { ...filter.age, $lte: maxAgeNum };
    }
  }
  
  if (min_gender_probability) {
    const minProbNum = parseFloat(min_gender_probability);
    if (!isNaN(minProbNum) && minProbNum >= 0 && minProbNum <= 1) {
      filter.gender_probability = { $gte: minProbNum };
    }
  }
  
  if (min_country_probability) {
    const minProbNum = parseFloat(min_country_probability);
    if (!isNaN(minProbNum) && minProbNum >= 0 && minProbNum <= 1) {
      filter.country_probability = { $gte: minProbNum };
    }
  }
  
  return filter;
}

function buildSort(req) {
  const { sort_by, order } = req.query;
  
  if (sort_by === "age") {
    return { age: order === "asc" ? 1 : -1 };
  }
  if (sort_by === "gender_probability") {
    return { gender_probability: order === "asc" ? 1 : -1 };
  }
  if (sort_by === "created_at") {
    return { created_at: order === "asc" ? 1 : -1 };
  }
  
  return { created_at: -1 };
}

router.post("/", async (req, res) => {
  try {
    const { name, gender, gender_probability, age, age_group, country_id, country_name, country_probability } = req.body;
    
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
      name: normalizedName,
      gender,
      gender_probability,
      age,
      age_group,
      country_id,
      country_name,
      country_probability,
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

router.get("/", async (req, res) => {
  try {
    const filter = buildFilter(req);
    const sort = buildSort(req);
    
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;
    
    const skip = (page - 1) * limit;
    
    const total = await Profile.countDocuments(filter);
    const profiles = await Profile.find(filter)
      .sort(sort)
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

router.get("/search", async (req, res) => {
  try {
    const { q, page, limit } = req.query;
    
    if (!q || q.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Query parameter 'q' is required"
      });
    }
    
    if (typeof q !== "string") {
      return res.status(422).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }
    
    const parsed = parseNaturalLanguage(q);
    
    if (parsed.error) {
      return res.status(400).json({
        status: "error",
        message: parsed.error
      });
    }
    
    const filter = {};
    if (parsed.filters.gender) filter.gender = parsed.filters.gender;
    if (parsed.filters.age_group) filter.age_group = parsed.filters.age_group;
    if (parsed.filters.country_id) filter.country_id = parsed.filters.country_id;
    
    if (parsed.filters.min_age || parsed.filters.max_age) {
      filter.age = {};
      if (parsed.filters.min_age) filter.age.$gte = parsed.filters.min_age;
      if (parsed.filters.max_age) filter.age.$lte = parsed.filters.max_age;
    }
    
    let queryPage = parseInt(page);
    let queryLimit = parseInt(limit);
    if (isNaN(queryPage) || queryPage < 1) queryPage = 1;
    if (isNaN(queryLimit) || queryLimit < 1) queryLimit = 10;
    if (queryLimit > 50) queryLimit = 50;
    
    const skip = (queryPage - 1) * queryLimit;
    const total = await Profile.countDocuments(filter);
    const profiles = await Profile.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(queryLimit);
    
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
      page: queryPage,
      limit: queryLimit,
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

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Profile.findOne({ id });
    
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

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Profile.findOneAndDelete({ id });
    
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