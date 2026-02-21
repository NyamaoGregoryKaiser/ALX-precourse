```cpp
#ifndef ALERTCONTROLLER_H
#define ALERTCONTROLLER_H

#include <crow.h>
#include <string>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <memory>

#include "../services/AlertService.h"
#include "../services/SystemService.h" // To verify system ownership
#include "../database/DbConnection.h"
#include "../utils/Logger.h"
#include "../exceptions/ApiException.h"
#include "../utils/JsonUtils.h"
#include "../middleware/AuthMiddleware.h" // For AuthContext

class AlertController {
public:
    AlertController(std::function<std::shared_ptr<pqxx::connection>()> get_conn_func)
        : get_conn_from_pool(std::move(get_conn_func)) {}

    // Create a new alert
    crow::response createAlert(const crow::request& req) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::string system_id = JsonUtils::get_required<std::string>(request_body, "system_id");
            std::string metric_name = JsonUtils::get_required<std::string>(request_body, "metric_name");
            double threshold_value = JsonUtils::get_required<double>(request_body, "threshold_value");
            std::string comparison_op_str = JsonUtils::get_required<std::string>(request_body, "comparison_operator");
            std::string status = JsonUtils::get_string(request_body, "status", "active"); // Default to active
            std::optional<std::string> alert_message = JsonUtils::get_optional<std::string>(request_body, "alert_message");

            ComparisonOperator comparison_op = string_to_comparison_operator(comparison_op_str);

            // Verify user owns the system
            auto conn_system = get_conn_from_pool();
            SystemService systemService(conn_system);
            std::optional<System> system_check = systemService.get_system(user_id, system_id);
            DbConnection::release_connection(conn_system);

            if (!system_check) {
                throw ApiException(crow::BAD_REQUEST, "System not found or not owned by user.");
            }
            
            auto conn_alert = get_conn_from_pool();
            AlertService alertService(conn_alert);
            Alert alert = alertService.create_alert(user_id, system_id, metric_name, threshold_value, comparison_op, status, alert_message);
            DbConnection::release_connection(conn_alert);

            return crow::response(crow::CREATED, alert.to_json().dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in createAlert: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields: " + std::string(e.what()));
        } catch (const std::invalid_argument& e) { // For string_to_comparison_operator
            throw ApiException(crow::BAD_REQUEST, "Invalid comparison_operator: " + std::string(e.what()));
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in createAlert for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during alert creation.");
        }
    }

    // Get alerts for the authenticated user
    crow::response getAlerts(const crow::request& req) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            std::optional<std::string> system_id_filter = req.url_params.get("system_id");
            
            auto conn = get_conn_from_pool();
            AlertService alertService(conn);
            std::vector<Alert> alerts = alertService.get_alerts_for_user(user_id, system_id_filter);
            DbConnection::release_connection(conn);

            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& alert : alerts) {
                response_json.push_back(alert.to_json());
            }
            return crow::response(crow::OK, response_json.dump());

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getAlerts for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Get a single alert by ID for the authenticated user
    crow::response getAlert(const crow::request& req, const std::string& alert_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            auto conn = get_conn_from_pool();
            AlertService alertService(conn);
            std::optional<Alert> alert = alertService.get_alert(user_id, alert_id);
            DbConnection::release_connection(conn);

            if (!alert) {
                throw ApiException(crow::NOT_FOUND, "Alert not found or not owned by user.");
            }

            return crow::response(crow::OK, alert->to_json().dump());

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getAlert for user {} alert {}: {}", user_id, alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Update an existing alert
    crow::response updateAlert(const crow::request& req, const std::string& alert_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::optional<std::string> metric_name = JsonUtils::get_optional<std::string>(request_body, "metric_name");
            std::optional<double> threshold_value = JsonUtils::get_optional<double>(request_body, "threshold_value");
            std::optional<ComparisonOperator> comparison_op;
            if (request_body.contains("comparison_operator") && request_body["comparison_operator"].is_string()) {
                comparison_op = string_to_comparison_operator(request_body["comparison_operator"].get<std::string>());
            }
            std::optional<std::string> status = JsonUtils::get_optional<std::string>(request_body, "status");
            std::optional<std::string> alert_message = JsonUtils::get_optional<std::string>(request_body, "alert_message");
            
            auto conn = get_conn_from_pool();
            AlertService alertService(conn);
            Alert updated_alert = alertService.update_alert(user_id, alert_id, metric_name, threshold_value, comparison_op, status, alert_message);
            DbConnection::release_connection(conn);

            return crow::response(crow::OK, updated_alert.to_json().dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in updateAlert: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields: " + std::string(e.what()));
        } catch (const std::invalid_argument& e) {
            throw ApiException(crow::BAD_REQUEST, "Invalid comparison_operator: " + std::string(e.what()));
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in updateAlert for user {} alert {}: {}", user_id, alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during alert update.");
        }
    }

    // Delete an alert
    crow::response deleteAlert(const crow::request& req, const std::string& alert_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            auto conn = get_conn_from_pool();
            AlertService alertService(conn);
            alertService.delete_alert(user_id, alert_id);
            DbConnection::release_connection(conn);

            return crow::response(crow::NO_CONTENT);

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in deleteAlert for user {} alert {}: {}", user_id, alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during alert deletion.");
        }
    }

    // Get alert history for a specific alert
    crow::response getAlertHistory(const crow::request& req, const std::string& alert_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            int limit = 100; // Default limit for history
            if (req.url_params.get("limit")) {
                limit = std::stoi(std::string(req.url_params.get("limit")));
            }

            auto conn = get_conn_from_pool();
            AlertService alertService(conn);
            std::vector<AlertHistory> histories = alertService.get_alert_history(user_id, alert_id, limit);
            DbConnection::release_connection(conn);

            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& history : histories) {
                response_json.push_back(history.to_json());
            }
            return crow::response(crow::OK, response_json.dump());

        } catch (const std::invalid_argument& e) {
            throw ApiException(crow::BAD_REQUEST, "Invalid limit parameter: " + std::string(e.what()));
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getAlertHistory for user {} alert {}: {}", user_id, alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

private:
    std::function<std::shared_ptr<pqxx::connection>()> get_conn_from_pool;
};

#endif // ALERTCONTROLLER_H
```

---

### 2. Database Layer

Schema definitions, migrations, and seed data are included within the `src/database` folder as shown above.
*   **`src/database/migrations/V1_create_initial_schema.sql`**: Sets up basic user, system, and metric tables.
*   **`src/database/migrations/V2_add_alert_tables.sql`**: Adds tables for alerts and alert history.
*   **`src/database/seed/seed_data.sql`**: Populates the database with an admin user and an example system.
*   **`src/database/DbConnection.cpp`**: Handles database connection pooling, applies migrations, and seeds data programmatically.

**Query Optimization**:
*   Indexes are defined in migration scripts (e.g., `idx_users_email`, `idx_metrics_system_time`).
*   Queries in services use `WHERE` clauses on indexed columns.
*   Metric aggregation uses `time_bucket` for efficient time-series grouping.
*   Connection pooling minimizes connection overhead.

---

### 3. Configuration & Setup