# Intelligence Query Engine

A queryable API for demographic intelligence with advanced filtering, sorting, pagination, and natural language search.

## Base URL

https://hng-14-omega.vercel.app/

## Endpoints

### GET /api/profiles

Advanced filtering with sorting and pagination.

**Query Parameters:**

- `gender` - male, female
- `age_group` - child, teenager, adult, senior
- `country_id` - ISO code (NG, US, KE)
- `min_age` - Minimum age
- `max_age` - Maximum age
- `min_gender_probability` - Minimum confidence (0-1)
- `min_country_probability` - Minimum confidence (0-1)
- `sort_by` - age, created_at, gender_probability
- `order` - asc, desc
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 50)

**Example:**

```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Response:**

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": [
    {
      "id": "uuid",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}
```

### GET /api/profiles/search

Natural language query parsing. No AI or LLM - rule-based only.

**Examples:**

```
GET /api/profiles/search?q=young males from nigeria
GET /api/profiles/search?q=females above 30
GET /api/profiles/search?q=adult males from kenya
GET /api/profiles/search?q=male and female teenagers above 17
```

**Response:** Same paginated format as GET /api/profiles.

### POST /api/profiles

Create a new profile.

**Request:**

```json
{
  "name": "ella",
  "gender": "female",
  "gender_probability": 0.99,
  "age": 46,
  "age_group": "adult",
  "country_id": "DRC",
  "country_name": "Democratic Republic of Congo",
  "country_probability": 0.85
}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-v7",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_name": "Democratic Republic of Congo",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

**Duplicate name (200):**

```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { ... }
}
```

### GET /api/profiles/{id}

Get profile by UUID v7.

**Response (200):** Same as POST response structure.

### DELETE /api/profiles/{id}

Delete a profile.

**Response:** 204 No Content (no body)

## Natural Language Mapping

| Query Term             | Maps To                |
| ---------------------- | ---------------------- |
| young                  | min_age=16, max_age=24 |
| male / men / boys      | gender=male            |
| female / women / girls | gender=female          |
| child / children / kid | age_group=child        |
| teen / teenager        | age_group=teenager     |
| adult                  | age_group=adult        |
| senior / elder / old   | age_group=senior       |
| above / over {age}     | min_age={age}          |
| below / under {age}    | max_age={age}          |
| from / in {country}    | country_id={code}      |

## Error Responses

All errors follow this structure:

```json
{
  "status": "error",
  "message": "Error message here"
}
```

| Status | Description                                            |
| ------ | ------------------------------------------------------ |
| 400    | Missing or empty parameter / Unable to interpret query |
| 404    | Profile not found                                      |
| 422    | Invalid parameter type                                 |
| 500    | Internal server error                                  |

## Database Schema

| Field               | Type       | Notes                          |
| ------------------- | ---------- | ------------------------------ |
| id                  | UUID v7    | Primary key                    |
| name                | VARCHAR    | Unique, lowercase              |
| gender              | VARCHAR    | male or female                 |
| gender_probability  | FLOAT      | 0-1 confidence score           |
| age                 | INT        | Exact age                      |
| age_group           | VARCHAR    | child, teenager, adult, senior |
| country_id          | VARCHAR(2) | ISO code (NG, US, etc.)        |
| country_name        | VARCHAR    | Full country name              |
| country_probability | FLOAT      | 0-1 confidence score           |
| created_at          | TIMESTAMP  | UTC ISO 8601                   |

## Local Setup

```bash
# Install dependencies
npm install

# Create .env file
echo "MONGO_URI=your_mongodb_connection_string" > .env
echo "PORT=3000" >> .env

# Seed database with 2026 profiles
npm run seed

# Start development server
npm run dev
```

## Testing Commands

```bash
# Filtering
curl "https://hng-14-omega.vercel.app/api/profiles?gender=male&country_id=NG&min_age=25"

# Sorting
curl "https://hng-14-omega.vercel.app/api/profiles?sort_by=age&order=desc"

# Pagination
curl "https://hng-14-omega.vercel.app/api/profiles?page=2&limit=10"

# Natural language search
curl "https://hng-14-omega.vercel.app/profiles/search?q=young males from nigeria"
curl "https://hng-14-omega.vercel.app/api/profiles/search?q=females above 30"

# Get by ID
curl "https://hng-14-omega.vercel.app/api/profiles/{id}"

# Delete
curl -X DELETE "https://hng-14-omega.vercel.app/api/profiles/{id}"
```

## Performance Features

- MongoDB indexes on all filtered fields (gender, age_group, country_id, age, created_at, gender_probability, country_probability)
- Pagination with skip/limit (max 50 per page)
- Efficient queries with no full table scans

## Technologies

- Node.js with Express
- MongoDB with Mongoose ODM
- UUID v7 for identifiers
- CORS enabled
- Deployed on Vercel / Railway

## Deployment

Deploy to Vercel, Railway, or Heroku. Render is not accepted.

### Vercel Deployment

```bash
vercel --prod
```

Add environment variable in Vercel dashboard:

- Key: `MONGODB_URI`
- Value: Your MongoDB connection string

## Live API

(https://hng-14-omega.vercel.app/)
