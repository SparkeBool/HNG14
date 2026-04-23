markdown
# Intelligence Query Engine

API for demographic intelligence with filtering, sorting, pagination, and natural language search.


## Endpoints

### GET /api/profiles

Query parameters:
- gender (male/female)
- age_group (child/teenager/adult/senior)
- country_id (NG, US, KE, etc.)
- min_age, max_age
- min_gender_probability, min_country_probability
- sort_by (age/created_at/gender_probability)
- order (asc/desc)
- page, limit (default 10, max 50)

Response:
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 100,
  "data": [...]
}
GET /api/profiles/search
Natural language search. Examples:

/api/profiles/search?q=young males from nigeria

/api/profiles/search?q=females above 30

/api/profiles/search?q=adult males from kenya

POST /api/profiles
Create profile. Body: { "name": "ella", "gender": "female", ... }

GET /api/profiles/{id}
Get profile by UUID.

DELETE /api/profiles/{id}
Delete profile. Returns 204.

Setup
bash
npm install
npm run seed
npm run dev
Environment Variables
MONGOD_URI - MongoDB connection string
PORT


