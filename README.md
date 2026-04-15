
# Profile Intelligence API

## Overview

A REST API that enriches a person's name using third-party intelligence APIs (Genderize, Agify, Nationalize), processes the data, stores it in a database, and provides retrieval and management endpoints. The API handles duplicate data intelligently through idempotency and supports filtering for advanced queries.

## Features

- Name enrichment using Genderize, Agify, and Nationalize APIs
- Age group classification (child, teenager, adult, senior)
- Country selection based on highest probability
- Persistent storage in MongoDB with UUID v7 identifiers
- Idempotency: duplicate name submissions return existing data without creating new records
- Multiple endpoints: create, read (by ID, with filters), and delete profiles
- CORS enabled for cross-origin requests
- Comprehensive error handling with appropriate HTTP status codes

## API Endpoints

### Base URL

`https://your-app.vercel.app` (replace with your actual deployed URL)

### 1. Create Profile

`POST /api/profiles`

Creates a new intelligence profile for a given name.

**Request Body:**
```json
{
  "name": "ella"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

**Duplicate Name Response (200 OK):**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

### 2. Get Profile by ID

`GET /api/profiles/{id}`

Retrieves a single profile using its UUID v7 identifier.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "status": "error",
  "message": "Profile not found"
}
```

### 3. Get All Profiles with Filters

`GET /api/profiles?gender={gender}&country_id={country_id}&age_group={age_group}`

Retrieves a list of all stored profiles. Supports optional case-insensitive query parameters.

**Query Parameters:**
- `gender` - male, female
- `country_id` - Two-letter country code (e.g., NG, US, DRC)
- `age_group` - child, teenager, adult, senior

**Examples:**
```
GET /api/profiles
GET /api/profiles?gender=male
GET /api/profiles?country_id=NG
GET /api/profiles?age_group=adult
GET /api/profiles?gender=male&country_id=US
```

 Success Response (200 OK):**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    },
    {
      "id": "id-2",
      "name": "sarah",
      "gender": "female",
      "age": 28,
      "age_group": "adult",
      "country_id": "US"
    }
  ]
}
```

### 4. Delete Profile

`DELETE /api/profiles/{id}`

Deletes a profile from the database.

**Success Response:** `204 No Content` (no response body)

**Error Response (404 Not Found):**
```json
{
  "status": "error",
  "message": "Profile not found"
}
```

## Error Responses

All errors follow this structure:

```json
{
  "status": "error",
  "message": "<error message>"
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success (GET, duplicate POST) |
| 201 | Success (new profile created) |
| 204 | Success (profile deleted) |
| 400 | Bad Request - Missing or empty name |
| 404 | Not Found - Profile does not exist |
| 422 | Unprocessable Entity - Name is not a string |
| 500 | Internal Server Error |
| 502 | Bad Gateway - External API returned invalid response |

### External API Error Responses (502)

```json
{
  "status": "502",
  "message": "Genderize returned an invalid response"
}
```

```json
{
  "status": "502",
  "message": "Agify returned an invalid response"
}
```

```json
{
  "status": "502",
  "message": "Nationalize returned an invalid response"
}
```

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account 
- npm or yarn

### Setup Instructions

```bash
# Clone repository
git clone https://github.com/SparkeBool/HNG14.git
cd HNG14

# Install dependencies
npm install

# Create .env file
echo "MONGO_URI=your_mongodb_connection_string" > .env
echo "PORT=3000" >> .env

# Start development server
npm run dev
```

### Testing Locally

```bash
# Create a profile
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "john"}'

# Get all profiles
curl http://localhost:3000/api/profiles

# Filter by gender
curl http://localhost:3000/api/profiles?gender=male

# Filter by country
curl http://localhost:3000/api/profiles?country_id=NG

# Filter by age group
curl http://localhost:3000/api/profiles?age_group=adult

# Get by ID (replace with actual ID)
curl http://localhost:3000/api/profiles/your-uuid-id

# Delete profile
curl -X DELETE http://localhost:3000/api/profiles/your-uuid-id
```

## Project Structure

```
profile-intelligence-api/
├── models/
│   └── Profile.js
├── routes/
│   └── profiles.js
├── .env
├── .gitignore
├── index.js
├── package.json
├── vercel.json
└── README.md
```

## Technologies Used

- Node.js with Express.js
- MongoDB with Mongoose ODM
- Axios for external API calls
- UUID v7 for unique identifiers
- CORS for cross-origin support
- Dotenv for environment variables
- Deployed on Vercel

## External APIs Integrated

| API | Purpose | Endpoint |
|-----|---------|----------|
| Genderize.io | Gender prediction | `https://api.genderize.io/?name={name}` |
| Agify.io | Age prediction | `https://api.agify.io/?name={name}` |
| Nationalize.io | Nationality prediction | `https://api.nationalize.io/?name={name}` |

## Processing Rules

| Data | Source | Processing |
|------|--------|------------|
| gender | Genderize | Extracted directly |
| gender_probability | Genderize | Extracted directly |
| sample_size | Genderize | Renamed from `count` |
| age | Agify | Extracted directly |
| age_group | Calculated | 0-12: child, 13-19: teenager, 20-59: adult, 60+: senior |
| country_id | Nationalize | Country with highest probability |
| id | Generated | UUID v7 |
| created_at | Generated | UTC ISO 8601 timestamp |

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Add environment variable in Vercel dashboard
# Key: MONGODB_URI
# Value: your MongoDB connection string
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `PORT` | Server port (default: 3000) |

## License

MIT

## Author

Alayo Shamsudeen
## Live API
https://hng-14-omega.vercel.app/
