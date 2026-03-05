# Web Scraping Tools System - API Documentation

This document describes the RESTful API endpoints for the Web Scraping Tools System.

**Base URL**: `/api` (e.g., `http://localhost:5000/api`)

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:
`Authorization: Bearer <your_jwt_token>`

### 1. Register User

`POST /api/auth/register`

Registers a new user account.

**Request Body**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "strongpassword123"
}
```

**Response (201 Created)**:
```json
{
  "user": {
    "id": "uuid-of-user",
    "username": "newuser",
    "email": "newuser@example.com"
  },
  "tokens": {
    "token": "jwt-access-token"
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Validation error (e.g., username taken, invalid email, weak password).

### 2. Login User

`POST /api/auth/login`

Authenticates a user and provides a JWT token.

**Request Body**:
```json
{
  "username": "existinguser",
  "password": "strongpassword123"
}
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": "uuid-of-user",
    "username": "existinguser",
    "email": "existinguser@example.com"
  },
  "tokens": {
    "token": "jwt-access-token"
  }
}
```

**Error Responses**:
*   `401 Unauthorized`: Invalid credentials.

### 3. Logout User

`POST /api/auth/logout`

(Note: In a stateless JWT system, logout is often handled client-side by deleting the token. This endpoint can be used for session invalidation on the server if a blacklist/revocation mechanism is implemented.)

**Response (204 No Content)**:
*   No body

---

## Scrapers

### 1. Create Scraper

`POST /api/scrapers` (Protected)

Creates a new web scraper configuration.

**Request Body**:
```json
{
  "name": "My First Scraper",
  "description": "Scrapes product names and prices from an e-commerce site.",
  "start_url": "https://www.example.com/products",
  "selectors_json": "{\n  \"item\": \".product-card\",\n  \"fields\": {\n    \"name\": \".product-title\",\n    \"price\": \".product-price\",\n    \"link\": {\"selector\": \"a.product-link\", \"attr\": \"href\"}\n  }\n}",
  "schedule_cron": "0 0 * * *",
  "is_active": true,
  "scraping_method": "puppeteer"
}
```
*   `selectors_json`: A JSON string defining the CSS selectors.
    *   `item`: CSS selector for the parent element of each item.
    *   `fields`: An object where keys are desired data field names and values are either:
        *   A string (CSS selector for text content).
        *   An object `{"selector": "...", "attr": "..."}` (CSS selector for an attribute's value).
*   `schedule_cron`: A cron expression (e.g., `0 0 * * *` for daily at midnight). Leave empty for manual triggering.
*   `scraping_method`: `cheerio` (for static HTML) or `puppeteer` (for dynamic, JavaScript-rendered content).

**Response (201 Created)**:
```json
{
  "id": "uuid-of-scraper",
  "user_id": "uuid-of-user",
  "name": "My First Scraper",
  "description": "...",
  "start_url": "https://www.example.com/products",
  "selectors_json": "{ ... }",
  "schedule_cron": "0 0 * * *",
  "is_active": true,
  "scraping_method": "puppeteer",
  "last_run": null,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `400 Bad Request`: Validation error (e.g., invalid URL, invalid selectors JSON, duplicate scraper name for user).

### 2. Get All Scrapers

`GET /api/scrapers` (Protected)

Retrieves all scraper configurations owned by the authenticated user.

**Response (200 OK)**:
```json
[
  {
    "id": "uuid-of-scraper-1",
    "user_id": "uuid-of-user",
    "name": "Scraper A",
    "description": "...",
    "start_url": "...",
    "selectors_json": "{ ... }",
    "schedule_cron": "...",
    "is_active": true,
    "scraping_method": "cheerio",
    "last_run": "timestamp",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  },
  {
    "id": "uuid-of-scraper-2",
    // ...
  }
]
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.

### 3. Get Scraper by ID

`GET /api/scrapers/:scraperId` (Protected)

Retrieves a specific scraper configuration by its ID.

**Response (200 OK)**:
```json
{
  "id": "uuid-of-scraper",
  "user_id": "uuid-of-user",
  "name": "My First Scraper",
  "description": "...",
  "start_url": "https://www.example.com/products",
  "selectors_json": "{ ... }",
  "schedule_cron": "0 0 * * *",
  "is_active": true,
  "scraping_method": "puppeteer",
  "last_run": "timestamp",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `404 Not Found`: Scraper not found or not owned by the user.

### 4. Update Scraper

`PATCH /api/scrapers/:scraperId` (Protected)

Updates an existing scraper configuration. Only provided fields will be updated.

**Request Body**:
```json
{
  "name": "Updated Scraper Name",
  "is_active": false,
  "schedule_cron": ""
}
```

**Response (200 OK)**:
Returns the updated scraper object.

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `400 Bad Request`: Validation error.
*   `404 Not Found`: Scraper not found or not owned by the user.

### 5. Delete Scraper

`DELETE /api/scrapers/:scraperId` (Protected)

Deletes a scraper configuration and all associated scrape jobs and scraped items.

**Response (204 No Content)**:
*   No body.

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `404 Not Found`: Scraper not found or not owned by the user.

### 6. Trigger Scrape Job

`POST /api/scrapers/:scraperId/trigger` (Protected)

Manually triggers a scrape job for a specific scraper.

**Response (202 Accepted)**:
```json
{
  "message": "Scrape job queued successfully",
  "jobId": "uuid-of-new-scrape-job"
}
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `404 Not Found`: Scraper not found or not owned by the user.
*   `500 Internal Server Error`: If job queueing fails.

### 7. Get Scraper's Jobs

`GET /api/scrapers/:scraperId/jobs` (Protected)

Retrieves a list of scrape jobs for a specific scraper.

**Query Parameters**:
*   `page` (optional): Page number (default: 1)
*   `limit` (optional): Number of jobs per page (default: 10)

**Response (200 OK)**:
```json
{
  "page": 1,
  "limit": 10,
  "total": 5,
  "jobs": [
    {
      "id": "uuid-of-job-1",
      "scraper_id": "uuid-of-scraper",
      "start_time": "timestamp",
      "end_time": "timestamp",
      "status": "completed",
      "error_message": null,
      "items_scraped": 100,
      "created_at": "timestamp"
    },
    // ...
  ]
}
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `404 Not Found`: Scraper not found or not owned by the user.

### 8. Get Scraper's Items

`GET /api/scrapers/:scraperId/items` (Protected)

Retrieves all scraped items collected by a specific scraper, across all its jobs.

**Query Parameters**:
*   `page` (optional): Page number (default: 1)
*   `limit` (optional): Number of items per page (default: 20)

**Response (200 OK)**:
```json
{
  "page": 1,
  "limit": 20,
  "total": 250,
  "items": [
    {
      "id": "uuid-of-item-1",
      "job_id": "uuid-of-job",
      "scraper_id": "uuid-of-scraper",
      "data": {
        "name": "Product A",
        "price": "$10.99",
        "link": "https://example.com/product/a"
      },
      "url": "https://example.com/products",
      "scraped_at": "timestamp"
    },
    // ...
  ]
}
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `404 Not Found`: Scraper not found or not owned by the user.

---

## Scrape Jobs

### 1. Get Job Details

`GET /api/jobs/:jobId` (Protected)

Retrieves details of a specific scrape job.

**Response (200 OK)**:
```json
{
  "id": "uuid-of-job",
  "scraper_id": "uuid-of-scraper",
  "start_time": "timestamp",
  "end_time": "timestamp",
  "status": "completed",
  "error_message": null,
  "items_scraped": 100,
  "created_at": "timestamp"
}
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `404 Not Found`: Job not found or associated scraper not owned by the user.

### 2. Get Job's Scraped Items

`GET /api/jobs/:jobId/items` (Protected)

Retrieves all items scraped during a specific job execution.

**Response (200 OK)**:
```json
[
  {
    "id": "uuid-of-item-1",
    "job_id": "uuid-of-job",
    "scraper_id": "uuid-of-scraper",
    "data": {
      "name": "Product A",
      "price": "$10.99",
      "link": "https://example.com/product/a"
    },
    "url": "https://example.com/products",
    "scraped_at": "timestamp"
  },
  {
    "id": "uuid-of-item-2",
    "job_id": "uuid-of-job",
    "scraper_id": "uuid-of-scraper",
    "data": {
      "name": "Product B",
      "price": "$25.00",
      "link": "https://example.com/product/b"
    },
    "url": "https://example.com/products",
    "scraped_at": "timestamp"
  }
]
```

**Error Responses**:
*   `401 Unauthorized`: Missing or invalid token.
*   `404 Not Found`: Job not found or associated scraper not owned by the user.