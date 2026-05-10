# API Documentation

This document provides a high-level overview of the API endpoints. For detailed interactive documentation, please refer to the auto-generated OpenAPI (Swagger UI) at: **`http://localhost:8000/api/v1/docs`**.

## Base URL

`/api/v1`

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header: `Authorization: Bearer <your_token>`.

### `POST /login/access-token`
*   **Description**: Authenticate a user and receive an access token.
*   **Request**: `application/x-www-form-urlencoded`
    *   `username` (string, email)
    *   `password` (string)
*   **Response**: `200 OK` (Token schema: `access_token`, `token_type`)
*   **Errors**: `400 Bad Request` (Incorrect email or password)

### `POST /signup`
*   **Description**: Register a new user.
*   **Request**: `application/json` (UserCreate schema)
*   **Response**: `201 Created` (UserRead schema)
*   **Errors**: `400 Bad Request` (User with email already exists)

## Users

### `GET /users/me`
*   **Description**: Get details of the current authenticated user.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (UserRead schema)

### `PUT /users/me`
*   **Description**: Update details of the current authenticated user.
*   **Authorization**: Required (Active User)
*   **Request**: `application/json` (UserUpdate schema)
*   **Response**: `200 OK` (UserRead schema)

### `GET /users/`
*   **Description**: Retrieve a list of all users.
*   **Authorization**: Required (Active Admin)
*   **Query Params**: `skip` (int), `limit` (int)
*   **Response**: `200 OK` (List of UserRead schema)

### `GET /users/{user_id}`
*   **Description**: Get details of a specific user by ID.
*   **Authorization**: Required (Active Admin)
*   **Response**: `200 OK` (UserRead schema)
*   **Errors**: `404 Not Found`

### `PUT /users/{user_id}`
*   **Description**: Update details of a specific user by ID.
*   **Authorization**: Required (Active Admin)
*   **Request**: `application/json` (UserUpdate schema)
*   **Response**: `200 OK` (UserRead schema)

### `DELETE /users/{user_id}`
*   **Description**: Delete a specific user by ID.
*   **Authorization**: Required (Active Admin)
*   **Response**: `204 No Content`

## Services

### `GET /services/`
*   **Description**: Retrieve a list of all registered services.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (List of ServiceRead schema)

### `GET /services/with-latest-metrics`
*   **Description**: Retrieve a list of services with their most recent metric records for each metric type.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (List of ServiceWithLatestMetrics schema)

### `POST /services/`
*   **Description**: Create a new service.
*   **Authorization**: Required (Active Admin)
*   **Request**: `application/json` (ServiceCreate schema)
*   **Response**: `201 Created` (ServiceRead schema)

### `GET /services/{service_id}`
*   **Description**: Get details of a specific service by ID.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (ServiceRead schema)

### `PUT /services/{service_id}`
*   **Description**: Update details of a specific service by ID.
*   **Authorization**: Required (Active Admin)
*   **Request**: `application/json` (ServiceUpdate schema)
*   **Response**: `200 OK` (ServiceRead schema)

### `DELETE /services/{service_id}`
*   **Description**: Delete a specific service by ID.
*   **Authorization**: Required (Active Admin)
*   **Response**: `204 No Content`

## Metric Types

### `GET /metric_types/`
*   **Description**: Retrieve a list of all defined metric types.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (List of MetricTypeRead schema)

### `POST /metric_types/`
*   **Description**: Create a new metric type.
*   **Authorization**: Required (Active Admin)
*   **Request**: `application/json` (MetricTypeCreate schema)
*   **Response**: `201 Created` (MetricTypeRead schema)

## Metric Records

### `POST /metric_records/`
*   **Description**: Submit a new metric data point for a service. Rate limited.
*   **Authorization**: Required (Active User)
*   **Request**: `application/json` (MetricRecordCreate schema)
*   **Response**: `201 Created` (MetricRecordRead schema)

### `GET /metric_records/`
*   **Description**: Retrieve a list of metric records with optional filters.
*   **Authorization**: Required (Active User)
*   **Query Params**: `service_id`, `metric_type_id`, `start_time`, `end_time`, `skip`, `limit`
*   **Response**: `200 OK` (List of MetricRecordRead schema)

### `GET /metric_records/service/{service_id}/latest`
*   **Description**: Get the latest metric record for each metric type for a given service.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (List of MetricRecordRead schema)

### `GET /metric_records/service/{service_id}/type/{metric_type_id}/history`
*   **Description**: Retrieve historical metric records for a specific service and metric type.
*   **Authorization**: Required (Active User)
*   **Query Params**: `period_hours` (int, default 24)
*   **Response**: `200 OK` (List of MetricRecordRead schema)

## Alert Rules

### `POST /alert_rules/`
*   **Description**: Create a new alert rule.
*   **Authorization**: Required (Active Admin)
*   **Request**: `application/json` (AlertRuleCreate schema)
*   **Response**: `201 Created` (AlertRuleRead schema)

### `GET /alert_rules/`
*   **Description**: Retrieve a list of alert rules with optional filters.
*   **Authorization**: Required (Active User)
*   **Query Params**: `service_id`, `metric_type_id`, `is_active`, `skip`, `limit`
*   **Response**: `200 OK` (List of AlertRuleRead schema)

### `GET /alert_rules/{rule_id}`
*   **Description**: Get details of a specific alert rule by ID.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (AlertRuleRead schema)

### `PUT /alert_rules/{rule_id}`
*   **Description**: Update details of a specific alert rule by ID.
*   **Authorization**: Required (Active Admin)
*   **Request**: `application/json` (AlertRuleUpdate schema)
*   **Response**: `200 OK` (AlertRuleRead schema)

### `DELETE /alert_rules/{rule_id}`
*   **Description**: Delete a specific alert rule by ID.
*   **Authorization**: Required (Active Admin)
*   **Response**: `204 No Content`

## Alert Notifications

### `GET /alert_notifications/`
*   **Description**: Retrieve a list of alert notifications with optional filters.
*   **Authorization**: Required (Active User)
*   **Query Params**: `service_id`, `alert_rule_id`, `is_resolved`, `start_time`, `end_time`, `skip`, `limit`
*   **Response**: `200 OK` (List of AlertNotificationRead schema)

### `GET /alert_notifications/{notification_id}`
*   **Description**: Get details of a specific alert notification by ID.
*   **Authorization**: Required (Active User)
*   **Response**: `200 OK` (AlertNotificationRead schema)

### `PUT /alert_notifications/{notification_id}`
*   **Description**: Update an alert notification (e.g., mark as resolved).
*   **Authorization**: Required (Active Admin)
*   **Request**: `application/json` (AlertNotificationUpdate schema)
*   **Response**: `200 OK` (AlertNotificationRead schema)

### `DELETE /alert_notifications/{notification_id}`
*   **Description**: Delete an alert notification by ID.
*   **Authorization**: Required (Active Admin)
*   **Response**: `204 No Content`

## Monitoring

### `GET /health`
*   **Description**: Health check endpoint for the API.
*   **Response**: `200 OK` (`{"status": "ok", "message": "Performance Monitoring System is running."}`)

```

#### `docs/architecture.md`
```markdown