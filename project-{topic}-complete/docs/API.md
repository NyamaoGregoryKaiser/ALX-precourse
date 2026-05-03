```markdown
# ML-Toolkit API Documentation

This document describes the RESTful API endpoints exposed by the ML-Toolkit C++ server. All endpoints are prefixed with `/api/v1`.

## Base URL
`http://localhost:8080/api/v1` (or your configured host and port)

## Authentication

All API endpoints, except `/api/v1/auth/login`, require authentication via a JSON Web Token (JWT). The token must be sent in the `Authorization` header with the `Bearer` scheme.

**Example Header**:
`Authorization: Bearer <your_jwt_token>`

### 1. User Login
-   **Endpoint**: `POST /api/v1/auth/login`
-   **Description**: Authenticates a user and issues a JWT token.
-   **Request Body**:
    ```json
    {
      "username": "admin",
      "password": "adminpass"
    }
    ```
-   **Success Response (200 OK)**:
    ```json
    {
      "status": "success",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Missing username/password.
    -   `403 Forbidden`: Invalid credentials.

---

## 2. Dataset Management

### 2.1. Create Dataset
-   **Endpoint**: `POST /api/v1/datasets`
-   **Description**: Registers a new dataset's metadata. The actual data file is assumed to exist at `file_path`.
-   **Request Body**:
    ```json
    {
      "name": "new_customer_data",
      "description": "Customer demographic and purchase history for churn prediction.",
      "file_path": "s3://my-data-lake/customer_churn/data.csv",
      "row_count": 100000,
      "col_count": 25,
      "feature_names": ["age", "gender", "income", "purchases", "churn_label"],
      "metadata": {
        "source": "CRM system",
        "last_sync": "2023-10-26T10:00:00Z",
        "target_variable": "churn_label"
      }
    }
    ```
-   **Success Response (201 Created)**: Returns the created dataset object including its `id`.
    ```json
    {
      "id": 1,
      "name": "new_customer_data",
      "description": "Customer demographic and purchase history for churn prediction.",
      "file_path": "s3://my-data-lake/customer_churn/data.csv",
      "row_count": 100000,
      "col_count": 25,
      "feature_names": ["age", "gender", "income", "purchases", "churn_label"],
      "metadata": {
        "source": "CRM system",
        "last_sync": "2023-10-26T10:00:00Z",
        "target_variable": "churn_label"
      },
      "created_at": 1678886400,
      "updated_at": 1678886400
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Missing `name` or `file_path`, invalid JSON.
    -   `409 Conflict`: Dataset with the same name already exists (DB constraint).

### 2.2. Get All Datasets
-   **Endpoint**: `GET /api/v1/datasets`
-   **Description**: Retrieves a list of all registered datasets.
-   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "name": "new_customer_data",
        "...": "..."
      },
      {
        "id": 2,
        "name": "web_traffic_logs",
        "...": "..."
      }
    ]
    ```

### 2.3. Get Dataset by ID
-   **Endpoint**: `GET /api/v1/datasets/{id}`
-   **Description**: Retrieves details for a specific dataset by its ID.
-   **Success Response (200 OK)**: Returns a single dataset object.
    ```json
    {
      "id": 1,
      "name": "new_customer_data",
      "...": "..."
    }
    ```
-   **Error Responses**:
    -   `404 Not Found`: Dataset with the given ID does not exist.

### 2.4. Update Dataset
-   **Endpoint**: `PUT /api/v1/datasets/{id}`
-   **Description**: Updates the metadata for an existing dataset.
-   **Request Body**:
    ```json
    {
      "description": "Updated description for customer data.",
      "row_count": 105000,
      "metadata": {
        "new_key": "new_