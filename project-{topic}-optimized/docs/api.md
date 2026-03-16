```markdown
# Scrapineer API Documentation

This document provides a detailed overview of the Scrapineer RESTful API endpoints.
For an interactive experience, please use the [Swagger UI](http://localhost:8080/swagger-ui.html) locally.

## Base URL

`http://localhost:8080/api` (for local development)
`https://api.scrapineer.com/api` (example production URL)

## Authentication

All protected API endpoints require a JSON Web Token (JWT) in the `Authorization` header.

**Request Header:**
`Authorization: Bearer <YOUR_JWT_TOKEN>`

### 1. User Authentication & Registration

**Register a New User**
*   **Endpoint:** `POST /auth/register`
*   **Description:** Creates a new user account.
*   **Request Body:** `application/json`
    ```json
    {
      "username": "newuser",
      "password": "strongpassword123",
      "roles": ["USER"] // Optional, defaults to ["USER"] if not provided
    }
    ```
*   **Response (201 Created):** `application/json`
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "username": "newuser"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If username already exists or validation fails.

**Authenticate User (Login)**
*   **Endpoint:** `POST /auth/login`
*   **Description:** Authenticates an existing user and returns a JWT token.
*   **Request Body:** `application/json`
    ```json
    {
      "username": "existinguser",
      "password": "existingpassword"
    }
    ```
*   **Response (200 OK):** `application/json`
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "username": "existinguser"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: If invalid credentials are provided.
    *   `400 Bad Request`: If validation fails.

---

### 2. Scraping Targets

Manage the websites or pages you want to scrape, including their CSS selectors.

**Get All Scraping Targets**
*   **Endpoint:** `GET /targets`
*   **Description:** Retrieves a list of all scraping targets owned by the authenticated user.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Response (200 OK):** `application/json` (Array of `ScrapingTargetDto`)
    ```json
    [
      {
        "id": 1,
        "userId": 1,
        "name": "My Blog Posts",
        "url": "https://myblog.com/posts",
        "description": "Scrape titles and links from my blog.",
        "active": true,
        "selectors": [
          {
            "id": 101,
            "name": "post_title",
            "selectorValue": "h2.post-title",
            "type": "TEXT",
            "attributeName": null
          },
          {
            "id": 102,
            "name": "post_link",
            "selectorValue": "h2.post-title a",
            "type": "ATTRIBUTE",
            "attributeName": "href"
          }
        ],
        "createdAt": "2023-10-27T10:00:00",
        "updatedAt": "2023-10-27T10:00:00"
      }
    ]
    ```

**Get Scraping Target by ID**
*   **Endpoint:** `GET /targets/{id}`
*   **Description:** Retrieves a single scraping target by its unique ID.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `id` (Long, required) - The ID of the target.
*   **Response (200 OK):** `application/json` (`ScrapingTargetDto`)
    *(Same structure as array element above)*
*   **Error Responses:**
    *   `404 Not Found`: If target with the given ID is not found or does not belong to the user.

**Create New Scraping Target**
*   **Endpoint:** `POST /targets`
*   **Description:** Creates a new scraping target with associated CSS selectors.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Request Body:** `application/json` (`ScrapingTargetDto` - `id`, `userId`, `createdAt`, `updatedAt` are ignored or set by server)
    ```json
    {
      "name": "New Product Page",
      "url": "https://ecommerce.com/product/123",
      "description": "Extract product details.",
      "active": true,
      "selectors": [
        {
          "name": "product_name",
          "selectorValue": "h1.product-title",
          "type": "TEXT"
        },
        {
          "name": "product_price",
          "selectorValue": "span.price",
          "type": "TEXT"
        },
        {
          "name": "product_image",
          "selectorValue": "img.main-image",
          "type": "ATTRIBUTE",
          "attributeName": "src"
        }
      ]
    }
    ```
*   **Response (201 Created):** `application/json` (`ScrapingTargetDto`)
*   **Error Responses:**
    *   `400 Bad Request`: If validation fails (e.g., missing name, invalid URL, empty selectors) or a target with the same name already exists for the user.

**Update Existing Scraping Target**
*   **Endpoint:** `PUT /targets/{id}`
*   **Description:** Updates an existing scraping target. All fields in the request body will replace the existing ones.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `id` (Long, required) - The ID of the target to update.
*   **Request Body:** `application/json` (`ScrapingTargetDto` - `id`, `userId`, `createdAt`, `updatedAt` are ignored or set by server)
    *(Same structure as Create, but `id` is required for path variable)*
*   **Response (200 OK):** `application/json` (`ScrapingTargetDto`)
*   **Error Responses:**
    *   `400 Bad Request`: If validation fails or the new name conflicts with another target.
    *   `404 Not Found`: If target with the given ID is not found or does not belong to the user.

**Delete Scraping Target**
*   **Endpoint:** `DELETE /targets/{id}`
*   **Description:** Deletes a scraping target. This will also delete all associated jobs and results.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `id` (Long, required) - The ID of the target to delete.
*   **Response (204 No Content):**
*   **Error Responses:**
    *   `404 Not Found`: If target with the given ID is not found or does not belong to the user.

---

### 3. Scraping Jobs

Manage and execute scraping jobs for defined targets.

**Get All Scraping Jobs**
*   **Endpoint:** `GET /jobs`
*   **Description:** Retrieves a list of all scraping jobs owned by the authenticated user.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Response (200 OK):** `application/json` (Array of `ScrapingJobDto`)
    ```json
    [
      {
        "id": 1,
        "targetId": 10,
        "targetName": "My Blog Posts",
        "userId": 1,
        "status": "SCHEDULED",
        "scheduleCron": "0 0 * * * *",
        "lastRunAt": "2023-10-27T10:00:00",
        "nextRunAt": "2023-10-27T11:00:00",
        "createdAt": "2023-10-27T09:00:00",
        "updatedAt": "2023-10-27T10:00:00"
      }
    ]
    ```

**Get Scraping Job by ID**
*   **Endpoint:** `GET /jobs/{id}`
*   **Description:** Retrieves a single scraping job by its unique ID.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `id` (Long, required) - The ID of the job.
*   **Response (200 OK):** `application/json` (`ScrapingJobDto`)
    *(Same structure as array element above)*
*   **Error Responses:**
    *   `404 Not Found`: If job with the given ID is not found or does not belong to the user.

**Create New Scraping Job**
*   **Endpoint:** `POST /jobs`
*   **Description:** Creates a new scraping job.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Request Body:** `application/json` (`ScrapingJobDto` - `id`, `userId`, `targetName`, `lastRunAt`, `nextRunAt`, `createdAt`, `updatedAt` are ignored or set by server)
    ```json
    {
      "targetId": 10,
      "status": "SCHEDULED",
      "scheduleCron": "0 0 12 * * ?" // Every day at noon. Use null or empty string for manual jobs.
    }
    ```
*   **Response (201 Created):** `application/json` (`ScrapingJobDto`)
*   **Error Responses:**
    *   `400 Bad Request`: If validation fails (e.g., invalid CRON expression) or target ID is invalid.
    *   `404 Not Found`: If the associated `targetId` does not exist or does not belong to the user.

**Update Existing Scraping Job**
*   **Endpoint:** `PUT /jobs/{id}`
*   **Description:** Updates an existing scraping job (e.g., change schedule or status).
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `id` (Long, required) - The ID of the job to update.
*   **Request Body:** `application/json` (`ScrapingJobDto` - `id`, `userId`, `targetId`, `targetName`, `createdAt`, `updatedAt` are ignored or set by server)
    ```json
    {
      "status": "PAUSED",
      "scheduleCron": "0 0/30 * * * *" // Change to every 30 minutes
    }
    ```
*   **Response (200 OK):** `application/json` (`ScrapingJobDto`)
*   **Error Responses:**
    *   `400 Bad Request`: If validation fails (e.g., invalid CRON expression).
    *   `404 Not Found`: If job with the given ID is not found or does not belong to the user.

**Manually Start a Scraping Job**
*   **Endpoint:** `POST /jobs/{id}/start`
*   **Description:** Initiates a single run of a scraping job.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `id` (Long, required) - The ID of the job to start.
*   **Response (200 OK):** `application/json` (`ScrapingJobDto`)
*   **Error Responses:**
    *   `400 Bad Request`: If the target is inactive or the job is already running.
    *   `404 Not Found`: If job with the given ID is not found or does not belong to the user.

**Stop a Scraping Job**
*   **Endpoint:** `POST /jobs/{id}/stop`
*   **Description:** Stops a running or scheduled scraping job. Changes status to `STOPPED`.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `id` (Long, required) - The ID of the job to stop.
*   **Response (200 OK):** `application/json` (`ScrapingJobDto`)
*   **Error Responses:**
    *   `400 Bad Request`: If the job is already in a terminal state (COMPLETED, FAILED, STOPPED).
    *   `404 Not Found`: If job with the given ID is not found or does not belong to the user.

---

### 4. Scraping Results

Access the data extracted by scraping jobs.

**Get Scraping Results for a Specific Job**
*   **Endpoint:** `GET /jobs/{jobId}/results`
*   **Description:** Retrieves a paginated list of scraping results for a given job.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `jobId` (Long, required) - The ID of the job.
*   **Query Parameters:**
    *   `page` (int, optional, default: 0): Page number.
    *   `size` (int, optional, default: 10): Number of results per page.
*   **Response (200 OK):** `application/json` (Page of `ScrapingResultDto`)
    ```json
    {
      "content": [
        {
          "id": 1,
          "jobId": 1,
          "targetId": 10,
          "extractedData": {
            "page_title": "My Blog Post Title",
            "post_link": "https://myblog.com/post-slug"
          },
          "successful": true,
          "errorMessage": null,
          "timestamp": "2023-10-27T10:00:05"
        }
      ],
      "pageable": {
        "pageNumber": 0,
        "pageSize": 10,
        "sort": { "empty": true, "sorted": false, "unsorted": true },
        "offset": 0,
        "paged": true,
        "unpaged": false
      },
      "last": true,
      "totalPages": 1,
      "totalElements": 1,
      "size": 10,
      "number": 0,
      "sort": { "empty": true, "sorted": false, "unsorted": true },
      "first": true,
      "numberOfElements": 1,
      "empty": false
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: If the job or its target is not found or does not belong to the user.

**Get Specific Scraping Result by ID**
*   **Endpoint:** `GET /jobs/results/{resultId}`
*   **Description:** Retrieves a single scraping result by its unique ID.
*   **Authentication:** Required (`ROLE_USER` or `ROLE_ADMIN`)
*   **Path Variable:** `resultId` (Long, required) - The ID of the result.
*   **Response (200 OK):** `application/json` (`ScrapingResultDto`)
    *(Same structure as array element in `content` above)*
*   **Error Responses:**
    *   `404 Not Found`: If result with the given ID is not found or does not belong to the user.

---

## Error Responses

In case of an error, the API will return a JSON object with the following structure:

```json
{
  "status": 404,
  "timestamp": "27-10-2023 10:30:45",
  "message": "Scraping target not found with id 999",
  "details": "uri=/api/targets/999"
}
```

*   `status`: HTTP status code (e.g., 400, 401, 403, 404, 500).
*   `timestamp`: The time when the error occurred.
*   `message`: A brief description of the error.
*   `details`: More specific details about the request or error.

---
```