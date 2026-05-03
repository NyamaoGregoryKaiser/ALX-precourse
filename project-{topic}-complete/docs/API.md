# ML Utilities System API Documentation

This document provides an overview of the RESTful API endpoints for the ML Utilities System. For interactive exploration and testing, please refer to the [Swagger UI](#swagger-ui).

**Base URL:** `http://localhost:8080/api`

---

## Swagger UI

The interactive API documentation is available at:
[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

### How to use Swagger UI:

1.  Open the Swagger UI link in your browser.
2.  Click the **"Authorize"** button (usually at the top right).
3.  In the dialog, enter your JWT token in the format `Bearer <YOUR_JWT_TOKEN>`.
    *   You can obtain a JWT token by making a `POST` request to `/api/auth/login` with valid user credentials.
    *   **Default Users:**
        *   `admin` / `adminpass` (ROLE_ADMIN)
        *   `user` / `userpass` (ROLE_USER)
4.  Once authorized, you can execute protected endpoints.

---

## 1. Authentication Endpoints

**Tag:** `Authentication`

### 1.1. User Login
Authenticates a user and returns a JSON Web Token (JWT).

*   **Endpoint:** `POST /api/auth/login`
*   **Request Body (`application/json`):**
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
        ```
    *   `401 Unauthorized`: Invalid credentials.
    *   `400 Bad Request`: Invalid input (e.g., missing username/password).

### 1.2. User Registration
Registers a new user with `ROLE_USER`.

*   **Endpoint:** `POST /api/auth/register`
*   **Request Body (`application/json`):**
    ```json
    {
      "username": "string",
      "email": "user@example.com",
      "password": "string"
    }
    ```
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "id": "uuid",
          "username": "string",
          "email": "user@example.com",
          "registrationDate": "2023-10-27T10:00:00",
          "roles": [
            {
              "id": "uuid",
              "name": "ROLE_USER"
            }
          ]
        }
        ```
    *   `400 Bad Request`: Invalid input.
    *   `409 Conflict`: Username or email already exists.

---

## 2. Dataset Management Endpoints

**Tag:** `Dataset Management`
**Security:** Requires `bearerAuth` (JWT) with `ROLE_USER` or `ROLE_ADMIN`.

### 2.1. Upload a New Dataset (CSV)
Uploads a CSV file and stores its metadata.

*   **Endpoint:** `POST /api/datasets`
*   **Request Body (`multipart/form-data`):**
    *   `file`: The CSV file to upload.
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "id": "uuid",
          "filename": "string",
          "fileSize": 12345,
          "fileType": "text/csv",
          "ownerUsername": "string",
          "uploadDate": "2023-10-27T10:30:00"
        }
        ```
    *   `400 Bad Request`: Invalid file or upload error.
    *   `401 Unauthorized`: Missing or invalid token.

### 2.2. Get All Datasets for User
Retrieves metadata for all datasets owned by the authenticated user.

*   **Endpoint:** `GET /api/datasets`
*   **Responses:**
    *   `200 OK`:
        ```json
        [
          { /* DatasetMetadataDTO 1 */ },
          { /* DatasetMetadataDTO 2 */ }
        ]
        ```
    *   `401 Unauthorized`: Missing or invalid token.

### 2.3. Get Dataset by ID
Retrieves metadata for a specific dataset by its ID.

*   **Endpoint:** `GET /api/datasets/{id}`
*   **Path Variable:**
    *   `id` (UUID): The ID of the dataset.
*   **Responses:**
    *   `200 OK`:
        ```json
        { /* DatasetMetadataDTO */ }
        ```
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Dataset with the given ID not found or not owned by the user.

### 2.4. Download Dataset File
Downloads the actual CSV file content of a dataset.

*   **Endpoint:** `GET /api/datasets/{id}/download`
*   **Path Variable:**
    *   `id` (UUID): The ID of the dataset.
*   **Responses:**
    *   `200 OK`: Returns the raw CSV file content.
        *   `Content-Type: text/csv`
        *   `Content-Disposition: attachment; filename="<original_filename>"`
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Dataset not found or file not accessible.

### 2.5. Delete Dataset
Deletes a dataset and its corresponding file from storage.

*   **Endpoint:** `DELETE /api/datasets/{id}`
*   **Path Variable:**
    *   `id` (UUID): The ID of the dataset.
*   **Responses:**
    *   `204 No Content`: Dataset deleted successfully.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Dataset not found or not owned by the user.

---

## 3. Data Preprocessing Endpoints

**Tag:** `Data Preprocessing`
**Security:** Requires `bearerAuth` (JWT) with `ROLE_USER` or `ROLE_ADMIN`.

### 3.1. Apply Preprocessing
Applies one or more preprocessing transformations to a specified dataset and returns the processed data as a downloadable CSV.

*   **Endpoint:** `POST /api/preprocess`
*   **Request Body (`application/json`):**
    ```json
    {
      "datasetId": "uuid",
      "transformations": [
        {
          "type": "MIN_MAX_SCALING",
          "columns": ["feature1", "feature2"],
          "params": {} // Optional, e.g., for future complex transformations
        },
        {
          "type": "ONE_HOT_ENCODING",
          "columns": ["categorical_col"],
          "params": {}
        },
        {
          "type": "MEAN_IMPUTATION",
          "columns": ["numerical_col_with_missing"],
          "params": {}
        }
      ]
    }
    ```
    **Transformation Types:**
    *   `MIN_MAX_SCALING`: Scales numerical features to a [0, 1] range.
    *   `STANDARD_SCALING`: Scales numerical features to a mean of 0 and standard deviation of 1.
    *   `ONE_HOT_ENCODING`: Converts categorical features into a binary (0 or 1) representation.
    *   `MEAN_IMPUTATION`: Fills missing numerical values with the column's mean.
    *   `MEDIAN_IMPUTATION`: Fills missing numerical values with the column's median.

*   **Responses:**
    *   `200 OK`: Returns the processed CSV file content.
        *   `Content-Type: text/csv`
        *   `Content-Disposition: attachment; filename="processed_<original_filename>"`
    *   `400 Bad Request`: Invalid request, unsupported transformation, or data issues (e.g., non-numeric column for scaling).
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Dataset not found or not owned by the user.

---

## 4. Model Evaluation Endpoints

**Tag:** `Model Evaluation`
**Security:** Requires `bearerAuth` (JWT) with `ROLE_USER` or `ROLE_ADMIN`.

### 4.1. Evaluate Model Predictions
Calculates evaluation metrics based on true labels and model predictions within a dataset.

*   **Endpoint:** `POST /api/evaluate`
*   **Request Body (`application/json`):**
    ```json
    {
      "datasetId": "uuid",
      "trueLabelColumn": "string",
      "predictionColumn": "string",
      "metricType": "CLASSIFICATION" | "REGRESSION"
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "datasetId": "uuid",
          "trueLabelColumn": "string",
          "predictionColumn": "string",
          "metricType": "CLASSIFICATION",
          "metrics": {
            "Accuracy": 0.85,
            "Precision (Macro)": 0.82,
            "Recall (Macro)": 0.83,
            "F1-Score (Macro)": 0.825
          }
        }
        ```
        or for `REGRESSION`:
        ```json
        {
          "datasetId": "uuid",
          "trueLabelColumn": "string",
          "predictionColumn": "string",
          "metricType": "REGRESSION",
          "metrics": {
            "MSE": 1.25,
            "RMSE": 1.118,
            "MAE": 0.9,
            "R-squared": 0.98
          }
        }
        ```
    *   `400 Bad Request`: Invalid request, columns not found, or data issues (e.g., non-numeric for regression).
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Dataset not found or not owned by the user.

---
```