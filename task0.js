const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*'
}));

// Helper function to validate name
const validateName = (name) => {
  if (name === undefined || name === null || name === '') {
    return { valid: false, status: 400, message: 'Name parameter is required and cannot be empty' };
  }
  if (typeof name !== 'string') {
    return { valid: false, status: 422, message: 'Name must be a string' };
  }
  return { valid: true };
};

// GET /api/classify endpoint
app.get('/api/classify', async (req, res) => {
  try {
    const { name } = req.query;

    // Input validation
    const validation = validateName(name);
    if (!validation.valid) {
      return res.status(validation.status).json({
        status: 'error',
        message: validation.message
      });
    }

    // Call Genderize API
    const genderizeUrl = `https://api.genderize.io/?name=${encodeURIComponent(name)}`;
    
    let genderizeResponse;
    try {
      genderizeResponse = await axios.get(genderizeUrl, {
        timeout: 5000 // 5 second timeout
      });
    } catch (apiError) {
      console.error('Genderize API error:', apiError.message);
      return res.status(502).json({
        status: 'error',
        message: 'External API service unavailable'
      });
    }

    const { gender, probability, count } = genderizeResponse.data;

    // Handle edge cases
    if (gender === null || count === 0) {
      return res.status(200).json({
        status: 'error',
        message: 'No prediction available for the provided name'
      });
    }

    // Process the response
    const sample_size = count;
    const is_confident = (probability >= 0.7 && sample_size >= 100);
    const processed_at = new Date().toISOString();

    // Return success response
    return res.status(200).json({
      status: 'success',
      data: {
        name: name,
        gender: gender,
        probability: probability,
        sample_size: sample_size,
        is_confident: is_confident,
        processed_at: processed_at
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Endpoint available at http://localhost:${PORT}/api/classify?name=mark`);
});