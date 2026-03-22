```markdown
# API Documentation

The comprehensive API documentation for the Product Catalog system is generated automatically using Swagger/OpenAPI.

## Accessing the API Documentation

Once the backend service is running (either locally or via Docker Compose), you can access the interactive Swagger UI at the following URL:

[http://localhost:5000/api-docs](http://localhost:5000/api-docs)

This interface allows you to:
*   View all available API endpoints.
*   Understand request and response schemas.
*   Test API calls directly from your browser.
*   Authorize requests using JWT tokens to test protected endpoints.

The OpenAPI specification is defined in `src/backend/config/swagger.js`, with annotations (`@swagger`) embedded directly in the route files (`src/backend/routes/*.js`) and controller files (`src/backend/controllers/*.js`).
```