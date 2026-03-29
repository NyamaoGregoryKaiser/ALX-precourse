```markdown
# DataVizSystem API Documentation

This document provides a comprehensive overview of the DataVizSystem RESTful API endpoints.
The backend is implemented in C++ using the Crow web framework.

**Base URL**: `http://localhost:18080/api` (or your configured backend address)

## Authentication

All protected routes require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token.
`Authorization: Bearer <your_jwt_token>`

### 1. Register User

`POST /api/auth/register`

**Description**: Registers a new user with the system.
**Authentication**: Public (no token required)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "strong_password_123"
}
```

**Response (201 Created)**:
```json
{
  "status": "success",
  "message": "User registered successfully.",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2023-10-27T10:00:00Z",
    "updatedAt": "2023-10-27T10:00:00Z"
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Missing `email` or `password`, invalid format.
*   `409 Conflict`: User with this email already exists.
*   `500 Internal Server Error`: Failed to register user.

### 2. Login User

`POST /api/auth/login`

**Description**: Authenticates a user and returns a JWT token.
**Authentication**: Public

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "strong_password_123"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2023-10-27T10:00:00Z",
      "updatedAt": "2023-10-27T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoidXNlciIsImlzc3VlZERhdCI6IjIwMjMtMTAtMjdUMTA6MDA6MDBaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDIzLTExLTAzVDEwOjAwOjAwWiJ9.signature"
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Missing `email` or `password`.
*   `401 Unauthorized`: Invalid credentials.

## Dataset Endpoints

These endpoints manage datasets uploaded to the system.

### 1. Get All Datasets

`GET /api/datasets`

**Description**: Retrieves a list of all datasets. Admins see all datasets; regular users see only their own.
**Authentication**: Required (JWT)

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Datasets retrieved successfully.",
  "data": [
    {
      "id": 1,
      "userId": 1,
      "name": "Sample Sales Data",
      "description": "A sample dataset of sales figures.",
      "filePath": "./assets/datasets/sample_sales.csv",
      "fileType": "csv",
      "columns": [
        {"name": "Product", "type": "string", "isDimension": true, "isMeasure": false},
        {"name": "Sales", "type": "number", "isDimension": false, "isMeasure": true}
      ],
      "createdAt": "2023-10-27T10:00:00Z",
      "updatedAt": "2023-10-27T10:00:00Z"
    }
  ]
}
```

**Error Responses**:
*   `401 Unauthorized`: Authentication token missing or invalid.

### 2. Get Dataset by ID

`GET /api/datasets/{id}`

**Description**: Retrieves a single dataset by its ID.
**Authentication**: Required (JWT). User must own the dataset or be an admin.

**Path Parameters**:
*   `id` (integer): The ID of the dataset.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Dataset retrieved successfully.",
  "data": {
    "id": 1,
    "userId": 1,
    "name": "Sample Sales Data",
    "description": "A sample dataset of sales figures.",
    "filePath": "./assets/datasets/sample_sales.csv",
    "fileType": "csv",
    "columns": [
        {"name": "Product", "type": "string", "isDimension": true, "isMeasure": false},
        {"name": "Sales", "type": "number", "isDimension": false, "isMeasure": true}
    ],
    "createdAt": "2023-10-27T10:00:00Z",
    "updatedAt": "2023-10-27T10:00:00Z"
  }
}
```

**Error Responses**:
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the dataset.
*   `404 Not Found`: Dataset with the given ID does not exist.

### 3. Upload New Dataset

`POST /api/datasets`

**Description**: Uploads a new dataset file (e.g., CSV) and creates its metadata in the database.
**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "name": "Monthly Financial Report",
  "description": "Financial data for Q3 2023.",
  "fileName": "financial_report_q3.csv",
  "fileType": "csv",
  "fileContent": "Date,Revenue,Expenses\n2023-07-01,100000,50000\n2023-08-01,120000,60000"
}
```
*Note: `fileContent` should be the raw content of the file, not base64 encoded for this API version. For robust file uploads, consider `multipart/form-data`.*

**Response (201 Created)**:
```json
{
  "status": "success",
  "message": "Dataset uploaded and metadata created.",
  "data": {
    "id": 2,
    "userId": 1,
    "name": "Monthly Financial Report",
    "description": "Financial data for Q3 2023.",
    "filePath": "./assets/datasets/financial_report_q3.csv",
    "fileType": "csv",
    "columns": [
        {"name": "Date", "type": "date", "isDimension": true, "isMeasure": false},
        {"name": "Revenue", "type": "number", "isDimension": false, "isMeasure": true},
        {"name": "Expenses", "type": "number", "isDimension": false, "isMeasure": true}
    ],
    "createdAt": "2023-10-27T10:30:00Z",
    "updatedAt": "2023-10-27T10:30:00Z"
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Missing required fields, unsupported `fileType`, invalid CSV content.
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `500 Internal Server Error`: Failed to save file or create dataset metadata.

### 4. Update Dataset

`PUT /api/datasets/{id}`

**Description**: Updates the metadata of an existing dataset.
**Authentication**: Required (JWT). User must own the dataset or be an admin.

**Path Parameters**:
*   `id` (integer): The ID of the dataset to update.

**Request Body**:
```json
{
  "name": "Updated Sales Data",
  "description": "Revised description for sales figures."
}
```
*Note: `filePath`, `fileType`, and `fileContent` are typically not updated via this endpoint. For file changes, re-upload or use a dedicated file update endpoint.*

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Dataset updated successfully.",
  "data": {
    "id": 1,
    "userId": 1,
    "name": "Updated Sales Data",
    "description": "Revised description for sales figures.",
    "filePath": "./assets/datasets/sample_sales.csv",
    "fileType": "csv",
    "columns": [...],
    "createdAt": "2023-10-27T10:00:00Z",
    "updatedAt": "2023-10-27T10:45:00Z"
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Invalid request body.
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the dataset.
*   `404 Not Found`: Dataset with the given ID does not exist.
*   `500 Internal Server Error`: Failed to update dataset.

### 5. Delete Dataset

`DELETE /api/datasets/{id}`

**Description**: Deletes a dataset and its associated file from storage.
**Authentication**: Required (JWT). User must own the dataset or be an admin.

**Path Parameters**:
*   `id` (integer): The ID of the dataset to delete.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Dataset deleted successfully."
}
```

**Error Responses**:
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the dataset.
*   `404 Not Found`: Dataset with the given ID does not exist.
*   `500 Internal Server Error`: Failed to delete dataset file or metadata.

### 6. Get Processed Data for Dataset

`POST /api/datasets/{id}/data`

**Description**: Processes the raw data of a dataset based on filtering, grouping, aggregation, and sorting parameters, returning the ready-to-visualize data.
**Authentication**: Required (JWT). User must own the dataset or be an admin.

**Path Parameters**:
*   `id` (integer): The ID of the dataset to process.

**Request Body**:
```json
{
  "filters": [
    {"column": "Region", "operator": "=", "value": "East"},
    {"column": "Sales", "operator": ">", "value": "50"}
  ],
  "groupBy": [
    {"column": "Product", "alias": "ProductName"}
  ],
  "aggregations": [
    {"column": "Sales", "function": "sum", "alias": "TotalSales"},
    {"column": "Units", "function": "avg", "alias": "AverageUnits"}
  ],
  "sortBy": [
    {"column": "TotalSales", "direction": "desc"}
  ],
  "limit": 100
}
```
**Filter Operators**:
*   **Numeric**: `=`, `>`, `<`, `>=`, `<=`, `!=`
*   **String**: `=`, `contains`, `in` (with `values` array)
*   **Date**: (currently handled as string comparison, future improvement: date-specific operators)

**Aggregation Functions**:
*   `count`
*   `sum`
*   `avg`
*   `min`
*   `max`

**Sort Directions**:
*   `asc`
*   `desc`

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Data processed successfully.",
  "data": {
    "rows": [
      {"ProductName": "Laptop", "TotalSales": 3000.0, "AverageUnits": 15.0},
      {"ProductName": "Monitor", "TotalSales": 300.0, "AverageUnits": 30.0}
    ],
    "columns": [
        {"name": "ProductName", "type": "string", "isDimension": true, "isMeasure": false},
        {"name": "TotalSales", "type": "number", "isDimension": false, "isMeasure": true},
        {"name": "AverageUnits", "type": "number", "isDimension": false, "isMeasure": true}
    ]
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Invalid data processing request format.
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the dataset.
*   `404 Not Found`: Dataset with the given ID does not exist.
*   `500 Internal Server Error`: Failed to load or process data.

## Visualization Endpoints

These endpoints manage saved visualization configurations.

### 1. Get All Visualizations

`GET /api/visualizations`

**Description**: Retrieves a list of all visualization configurations. Admins see all; regular users see only their own.
**Authentication**: Required (JWT)

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Visualizations retrieved successfully.",
  "data": [
    {
      "id": 101,
      "userId": 1,
      "datasetId": 1,
      "name": "Sales by Product Bar Chart",
      "description": "Bar chart showing total sales for each product.",
      "chartType": "bar",
      "config": {
        "xAxis": {"column": "Product", "label": "Product Name"},
        "yAxis": {"column": "Sales", "label": "Total Sales", "aggregation": "sum"},
        "colors": ["#4285F4", "#DB4437"],
        "title": "Total Sales by Product"
      },
      "createdAt": "2023-10-27T11:00:00Z",
      "updatedAt": "2023-10-27T11:00:00Z"
    }
  ]
}
```

**Error Responses**:
*   `401 Unauthorized`: Authentication token missing or invalid.

### 2. Get Visualization by ID

`GET /api/visualizations/{id}`

**Description**: Retrieves a single visualization configuration by its ID.
**Authentication**: Required (JWT). User must own the visualization or be an admin.

**Path Parameters**:
*   `id` (integer): The ID of the visualization.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Visualization retrieved successfully.",
  "data": {
    "id": 101,
    "userId": 1,
    "datasetId": 1,
    "name": "Sales by Product Bar Chart",
    "description": "Bar chart showing total sales for each product.",
    "chartType": "bar",
    "config": {
      "xAxis": {"column": "Product", "label": "Product Name"},
      "yAxis": {"column": "Sales", "label": "Total Sales", "aggregation": "sum"},
      "colors": ["#4285F4", "#DB4437"],
      "title": "Total Sales by Product"
    },
    "createdAt": "2023-10-27T11:00:00Z",
    "updatedAt": "2023-10-27T11:00:00Z"
  }
}
```

**Error Responses**:
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the visualization.
*   `404 Not Found`: Visualization with the given ID does not exist.

### 3. Create New Visualization

`POST /api/visualizations`

**Description**: Creates a new visualization configuration linked to a dataset.
**Authentication**: Required (JWT). User must own the referenced dataset or be an admin.

**Request Body**:
```json
{
  "datasetId": 1,
  "name": "New Monthly Sales Line Chart",
  "description": "Line chart showing monthly sales trends.",
  "chartType": "line",
  "config": {
    "xAxis": {"column": "Date", "label": "Month"},
    "yAxis": {"column": "Sales", "label": "Monthly Sales", "aggregation": "sum"},
    "lineColor": "#0F9D58",
    "title": "Monthly Sales Trend"
  }
}
```

**Response (201 Created)**:
```json
{
  "status": "success",
  "message": "Visualization created successfully.",
  "data": {
    "id": 102,
    "userId": 1,
    "datasetId": 1,
    "name": "New Monthly Sales Line Chart",
    "description": "Line chart showing monthly sales trends.",
    "chartType": "line",
    "config": { ... },
    "createdAt": "2023-10-27T11:15:00Z",
    "updatedAt": "2023-10-27T11:15:00Z"
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Missing required fields, invalid `datasetId`.
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the referenced dataset.
*   `404 Not Found`: Referenced dataset does not exist.
*   `500 Internal Server Error`: Failed to create visualization.

### 4. Update Visualization

`PUT /api/visualizations/{id}`

**Description**: Updates an existing visualization configuration.
**Authentication**: Required (JWT). User must own the visualization or be an admin.

**Path Parameters**:
*   `id` (integer): The ID of the visualization to update.

**Request Body**:
```json
{
  "name": "Revised Monthly Sales Line Chart",
  "config": {
    "xAxis": {"column": "Date", "label": "Month"},
    "yAxis": {"column": "Sales", "label": "Monthly Sales (USD)", "aggregation": "sum"},
    "lineColor": "#4285F4",
    "title": "Revised Monthly Sales Trend"
  }
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Visualization updated successfully.",
  "data": {
    "id": 102,
    "userId": 1,
    "datasetId": 1,
    "name": "Revised Monthly Sales Line Chart",
    "description": "Line chart showing monthly sales trends.",
    "chartType": "line",
    "config": { ... },
    "createdAt": "2023-10-27T11:15:00Z",
    "updatedAt": "2023-10-27T11:30:00Z"
  }
}
```

**Error Responses**:
*   `400 Bad Request`: Invalid request body, new `datasetId` invalid or unauthorized.
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the visualization (or new referenced dataset).
*   `404 Not Found`: Visualization with the given ID does not exist.
*   `500 Internal Server Error`: Failed to update visualization.

### 5. Delete Visualization

`DELETE /api/visualizations/{id}`

**Description**: Deletes a visualization configuration.
**Authentication**: Required (JWT). User must own the visualization or be an admin.

**Path Parameters**:
*   `id` (integer): The ID of the visualization to delete.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Visualization deleted successfully."
}
```

**Error Responses**:
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: User does not own the visualization.
*   `404 Not Found`: Visualization with the given ID does not exist.
*   `500 Internal Server Error`: Failed to delete visualization.
```