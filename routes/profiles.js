import express from "express";
import { v7 as uuidv7 } from "uuid";
import Profile from "../models/Profile.js";

const router = express.Router();

// Helper: Validate numeric parameters
function validateNumericParam(value, paramName) {
  if (value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { error: `${paramName} must be a valid number` };
  }
  return num;
}

// Helper: Parse natural language query
function parseNaturalLanguage(query) {
  const filters = {};
  
  if (!query || query.trim() === "") {
    return { error: "Unable to interpret query" };
  }
  
  const q = query.toLowerCase().trim();
  
  // Gender detection
  if (q.includes("male") || q.includes("men") || q.includes("boys") || q.includes("guys")) {
    filters.gender = "male";
  }
  if (q.includes("female") || q.includes("women") || q.includes("girls") || q.includes("ladies")) {
    filters.gender = "female";
  }
  
  // Age group detection
  if (q.includes("child") || q.includes("children") || q.includes("kid") || q.includes("kids")) {
    filters.age_group = "child";
  }
  if (q.includes("teen") || q.includes("teenager") || q.includes("adolescent") || q.includes("youth")) {
    filters.age_group = "teenager";
  }
  if (q.includes("adult") || q.includes("grown")) {
    filters.age_group = "adult";
  }
  if (q.includes("senior") || q.includes("elder") || q.includes("old") || q.includes("aged")) {
    filters.age_group = "senior";
  }
  
  // Young mapping (ages 16-24)
  if (q.includes("young")) {
    filters.min_age = 16;
    filters.max_age = 24;
  }
  
  // Age above detection
  const aboveMatch = q.match(/(?:above|over|older than|greater than)\s+(\d+)/);
  if (aboveMatch) {
    filters.min_age = parseInt(aboveMatch[1]);
  }
  
  // Age below detection
  const belowMatch = q.match(/(?:below|under|younger than|less than)\s+(\d+)/);
  if (belowMatch) {
    filters.max_age = parseInt(belowMatch[1]);
  }
  
  // Age between detection
  const betweenMatch = q.match(/(?:between)\s+(\d+)\s+(?:and|to)\s+(\d+)/);
  if (betweenMatch) {
    filters.min_age = parseInt(betweenMatch[1]);
    filters.max_age = parseInt(betweenMatch[2]);
  }
  
  // Country mapping (extensive list)
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
    "ivory coast": "CI", "cote d'ivoire": "CI",
    "senegal": "SN", "senegalese": "SN",
    "zambia": "ZM", "zambian": "ZM",
    "zimbabwe": "ZW", "zimbabwean": "ZW",
    "rwanda": "RW", "rwandan": "RW",
    "tunisia": "TN", "tunisian": "TN",
    "algeria": "DZ", "algerian": "DZ",
    "sudan": "SD", "sudanese": "SD",
    "libya": "LY", "libyan": "LY",
    "somalia": "SO", "somali": "SO",
    "malawi": "MW", "malawian": "MW",
    "botswana": "BW", "botswanan": "BW",
    "namibia": "NA", "namibian": "NA",
    "mozambique": "MZ", "mozambican": "MZ",
    "mauritius": "MU", "mauritian": "MU",
    "seychelles": "SC", "seychellois": "SC",
    "congo": "CG", "congolese": "CG",
    "drc": "CD", "democratic republic of congo": "CD",
    "usa": "US", "america": "US", "united states": "US",
    "uk": "GB", "united kingdom": "GB", "britain": "GB",
    "canada": "CA", "canadian": "CA",
    "germany": "DE", "german": "DE",
    "france": "FR", "french": "FR",
    "italy": "IT", "italian": "IT",
    "spain": "ES", "spanish": "ES",
    "portugal": "PT", "portuguese": "PT",
    "netherlands": "NL", "dutch": "NL",
    "sweden": "SE", "swedish": "SE",
    "norway": "NO", "norwegian": "NO",
    "denmark": "DK", "danish": "DK",
    "finland": "FI", "finnish": "FI",
    "australia": "AU", "australian": "AU",
    "new zealand": "NZ", "new zealander": "NZ",
    "japan": "JP", "japanese": "JP",
    "china": "CN", "chinese": "CN",
    "india": "IN", "indian": "IN",
    "brazil": "BR", "brazilian": "BR",
    "mexico": "MX", "mexican": "MX",
    "argentina": "AR", "argentinian": "AR",
    "chile": "CL", "chilean": "CL",
    "peru": "PE", "peruvian": "PE",
    "colombia": "CO", "colombian": "CO",
    "venezuela": "VE", "venezuelan": "VE"
  };
  
  for (const [countryName, countryCode] of Object.entries(countryMap)) {
    if (q.includes(countryName)) {
      filters.country_id = countryCode;
      break;
    }
  }
  
  // From/in detection for country
  const fromMatch = q.match(/(?:from|in)\s+([a-z\s]+)/);
  if (fromMatch && !filters.country_id) {
    const location = fromMatch[1].trim();
    for (const [countryName, countryCode] of Object.entries(countryMap)) {
      if (location.includes(countryName)) {
        filters.country_id = countryCode;
        break;
      }
    }
  }
  
  // Both genders (male and female)
  if (q.includes("male and female") || q.includes("both genders") || q.includes("all genders")) {
    // No gender filter - return all
    delete filters.gender;
  }
  
  if (Object.keys(filters).length === 0) {
    return { error: "Unable to interpret query" };
  }
  
  return { filters };
}

// Helper: Build filter from query params
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
  
  // Validate and apply gender
  if (gender) {
    const genderLower = gender.toLowerCase();
    if (genderLower === "male" || genderLower === "female") {
      filter.gender = genderLower;
    } else {
      return { error: "Invalid query parameters" };
    }
  }
  
  // Validate and apply age_group
  if (age_group) {
    const ageGroupLower = age_group.toLowerCase();
    if (["child", "teenager", "adult", "senior"].includes(ageGroupLower)) {
      filter.age_group = ageGroupLower;
    } else {
      return { error: "Invalid query parameters" };
    }
  }
  
  // Validate and apply country_id
  if (country_id) {
    if (country_id.length === 2 || country_id.length === 3) {
      filter.country_id = country_id.toUpperCase();
    } else {
      return { error: "Invalid query parameters" };
    }
  }
  
  // Validate and apply min_age
  if (min_age) {
    const minAge = parseInt(min_age);
    if (isNaN(minAge) || minAge < 0) {
      return { error: "Invalid query parameters" };
    }
    filter.age = { ...filter.age, $gte: minAge };
  }
  
  // Validate and apply max_age
  if (max_age) {
    const maxAge = parseInt(max_age);
    if (isNaN(maxAge) || maxAge < 0) {
      return { error: "Invalid query parameters" };
    }
    filter.age = { ...filter.age, $lte: maxAge };
  }
  
  // Validate and apply min_gender_probability
  if (min_gender_probability) {
    const minProb = parseFloat(min_gender_probability);
    if (isNaN(minProb) || minProb < 0 || minProb > 1) {
      return { error: "Invalid query parameters" };
    }
    filter.gender_probability = { $gte: minProb };
  }
  
  // Validate and apply min_country_probability
  if (min_country_probability) {
    const minProb = parseFloat(min_country_probability);
    if (isNaN(minProb) || minProb < 0 || minProb > 1) {
      return { error: "Invalid query parameters" };
    }
    filter.country_probability = { $gte: minProb };
  }
  
  return { filter };
}

// Helper: Build sort object
function buildSort(req) {
  const { sort_by, order } = req.query;
  const allowed = ["age", "created_at", "gender_probability"];
  const field = allowed.includes(sort_by) ? sort_by : "created_at";
  const value = order === "asc" ? 1 : -1;
  return { [field]: value };
}

// Helper: Get pagination
function getPagination(req) {
  let page = parseInt(req.query.page);
  let limit = parseInt(req.query.limit);
  
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;
  if (limit > 50) limit = 50;
  
  return { page, limit, skip: (page - 1) * limit };
}

// ==================== POST /api/profiles ====================
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

// ==================== GET /api/profiles (filtering + sorting + pagination) ====================
router.get("/", async (req, res) => {
  try {
    const filterResult = buildFilter(req);
    
    if (filterResult.error) {
      return res.status(422).json({
        status: "error",
        message: filterResult.error
      });
    }
    
    const filter = filterResult.filter;
    const sort = buildSort(req);
    const { page, limit, skip } = getPagination(req);
    
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
      page,
      limit,
      total,
      data
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// ==================== GET /api/profiles/search (natural language) ====================
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
      total,
      data
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// ==================== GET /api/profiles/:id ====================
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

// ==================== DELETE /api/profiles/:id ====================
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