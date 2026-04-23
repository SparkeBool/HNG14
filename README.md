# Intelligence Query Engine

API for demographic intelligence with filtering, sorting, pagination, and natural language search.

## Endpoints

- GET /api/profiles - Filter, sort, paginate profiles
- GET /api/profiles/search - Natural language search
- GET /api/profiles/{id} - Get single profile
- POST /api/profiles - Create profile
- DELETE /api/profiles/{id} - Delete profile

## Query Parameters

- gender, age_group, country_id
- min_age, max_age
- min_gender_probability, min_country_probability
- sort_by (age, created_at, gender_probability)
- order (asc, desc)
- page, limit

## Response Format

{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 100,
  "data": [...]
}