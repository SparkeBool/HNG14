# Gender Classification API

## Overview
A REST API endpoint that classifies gender based on a given name by integrating with the Genderize.io API. The endpoint processes the raw API response and adds confidence scoring based on probability and sample size.

## Features
- GET endpoint at `/api/classify` with `name` query parameter
- Integration with Genderize.io API
- Confidence scoring based on probability (≥0.7) and sample size (≥100)
- ISO 8601 timestamp generation for each request
- CORS enabled for cross-origin requests
- Comprehensive error handling

## API Endpoint

### Base URL
https://hng-14-omega.vercel.app/api/classify?name=mark

### Endpoint