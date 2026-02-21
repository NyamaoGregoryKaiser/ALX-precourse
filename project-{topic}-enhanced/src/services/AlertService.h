```cpp
#ifndef ALERTSERVICE_H
#define ALERTSERVICE_H

#include <string>
#include <vector>
#include <memory>
#include <pqxx/pqxx>
#include <optional>

#include "../models/Alert.h"
#include "../utils/Logger.h"
#include "../utils/Crypto.h"
#include "../exceptions/ApiException.h"
#include "MetricService.h" // To fetch metrics for alert checking

class AlertService {
public:
    AlertService(std::shared_ptr<pqxx::connection> conn) : db_conn(std::move(conn)),
                                                            metric_service(std::make_unique<MetricService>(conn)) {}

    // Create a new alert
    Alert create_alert(const std::string& user_id, const std::string& system_id,
                       const std::string& metric_name, double threshold_value,
                       ComparisonOperator op, const std::string& status,
                       const std::optional<std::string>& alert_message) {
        
        if (metric_name.empty()) {
            throw ApiException(crow::BAD_REQUEST, "Metric name cannot be empty.");
        }

        std::string alert_id = Crypto::generate_uuid();
        std::string op_str = comparison_operator_to_string(op);

        try {
            pqxx::work w(*db_conn);
            pqxx::result r;
            if (alert_message) {
                r = w.exec_params(
                    "INSERT INTO alerts (id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message, created_at, updated_at",
                    alert_id, user_id, system_id, metric_name, threshold_value, op_str, status, *alert_message
                );
            } else {
                r = w.exec_params(
                    "INSERT INTO alerts (id, user_id, system_id, metric_name, threshold_value, comparison_operator, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message, created_at, updated_at",
                    alert_id, user_id, system_id, metric_name, threshold_value, op_str, status
                );
            }
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::INTERNAL_SERVER_ERROR, "Failed to create alert, no data returned.");
            }

            Alert alert;
            alert.id = r[0]["id"].as<std::string>();
            alert.user_id = r[0]["user_id"].as<std::string>();
            alert.system_id = r[0]["system_id"].as<std::string>();
            alert.metric_name = r[0]["metric_name"].as<std::string>();
            alert.threshold_value = r[0]["threshold_value"].as<double>();
            alert.comparison_operator = string_to_comparison_operator(r[0]["comparison_operator"].as<std::string>());
            alert.status = r[0]["status"].as<std::string>();
            alert.alert_message = r[0]["alert_message"].is_null() ? std::nullopt : std::make_optional(r[0]["alert_message"].as<std::string>());
            alert.created_at = r[0]["created_at"].as<std::string>();
            alert.updated_at = r[0]["updated_at"].as<std::string>();

            LOG_INFO("Alert created: {} for system {}", alert.id, system_id);
            return alert;

        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error creating alert for user {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error creating alert.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error creating alert for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during alert creation.");
        }
    }

    // Get an alert by its ID
    std::optional<Alert> get_alert(const std::string& user_id, const std::string& alert_id) {
        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(
                "SELECT id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message, created_at, updated_at FROM alerts WHERE id = $1 AND user_id = $2",
                alert_id, user_id
            );

            if (r.empty()) {
                return std::nullopt;
            }

            Alert alert;
            alert.id = r[0]["id"].as<std::string>();
            alert.user_id = r[0]["user_id"].as<std::string>();
            alert.system_id = r[0]["system_id"].as<std::string>();
            alert.metric_name = r[0]["metric_name"].as<std::string>();
            alert.threshold_value = r[0]["threshold_value"].as<double>();
            alert.comparison_operator = string_to_comparison_operator(r[0]["comparison_operator"].as<std::string>());
            alert.status = r[0]["status"].as<std::string>();
            alert.alert_message = r[0]["alert_message"].is_null() ? std::nullopt : std::make_optional(r[0]["alert_message"].as<std::string>());
            alert.created_at = r[0]["created_at"].as<std::string>();
            alert.updated_at = r[0]["updated_at"].as<std::string>();
            return alert;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error fetching alert {}: {}. Query: {}", alert_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching alert.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching alert {}: {}", alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Get all alerts for a user (optionally filtered by system)
    std::vector<Alert> get_alerts_for_user(const std::string& user_id, const std::optional<std::string>& system_id_filter) {
        std::vector<Alert> alerts;
        std::string query = "SELECT id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message, created_at, updated_at FROM alerts WHERE user_id = $1";
        std::vector<pqxx::param_type> params;
        params.push_back(user_id);
        int param_idx = 2;

        if (system_id_filter) {
            query += " AND system_id = $" + std::to_string(param_idx++);
            params.push_back(*system_id_filter);
        }
        query += " ORDER BY created_at DESC";

        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(query, params);

            for (const auto& row : r) {
                Alert alert;
                alert.id = row["id"].as<std::string>();
                alert.user_id = row["user_id"].as<std::string>();
                alert.system_id = row["system_id"].as<std::string>();
                alert.metric_name = row["metric_name"].as<std::string>();
                alert.threshold_value = row["threshold_value"].as<double>();
                alert.comparison_operator = string_to_comparison_operator(row["comparison_operator"].as<std::string>());
                alert.status = row["status"].as<std::string>();
                alert.alert_message = row["alert_message"].is_null() ? std::nullopt : std::make_optional(row["alert_message"].as<std::string>());
                alert.created_at = row["created_at"].as<std::string>();
                alert.updated_at = row["updated_at"].as<std::string>();
                alerts.push_back(alert);
            }
            LOG_DEBUG("Retrieved {} alerts for user {}.", alerts.size(), user_id);
            return alerts;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error fetching alerts for user {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching alerts.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching alerts for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Update an existing alert
    Alert update_alert(const std::string& user_id, const std::string& alert_id,
                       const std::optional<std::string>& metric_name,
                       const std::optional<double>& threshold_value,
                       const std::optional<ComparisonOperator>& op,
                       const std::optional<std::string>& status,
                       const std::optional<std::string>& alert_message) {
        
        std::vector<std::string> set_clauses;
        std::vector<pqxx::param_type> params;
        int param_idx = 1;

        if (metric_name) {
            set_clauses.push_back("metric_name = $" + std::to_string(param_idx++));
            params.push_back(*metric_name);
        }
        if (threshold_value) {
            set_clauses.push_back("threshold_value = $" + std::to_string(param_idx++));
            params.push_back(*threshold_value);
        }
        if (op) {
            set_clauses.push_back("comparison_operator = $" + std::to_string(param_idx++));
            params.push_back(comparison_operator_to_string(*op));
        }
        if (status) {
            set_clauses.push_back("status = $" + std::to_string(param_idx++));
            params.push_back(*status);
        }
        if (alert_message) {
            set_clauses.push_back("alert_message = $" + std::to_string(param_idx++));
            params.push_back(*alert_message);
        } else if (alert_message.has_value() && alert_message->empty()) { // Allow setting message to NULL
            set_clauses.push_back("alert_message = NULL");
        }

        if (set_clauses.empty()) {
            throw ApiException(crow::BAD_REQUEST, "No fields provided for update.");
        }

        std::string update_query = "UPDATE alerts SET " + set_clauses[0];
        for (size_t i = 1; i < set_clauses.size(); ++i) {
            update_query += ", " + set_clauses[i];
        }
        update_query += " WHERE id = $" + std::to_string(param_idx++) + " AND user_id = $" + std::to_string(param_idx++) + " RETURNING id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message, created_at, updated_at";
        params.push_back(alert_id);
        params.push_back(user_id);

        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(update_query, params);
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::NOT_FOUND, "Alert not found or not owned by user, or no changes made.");
            }

            Alert updated_alert;
            updated_alert.id = r[0]["id"].as<std::string>();
            updated_alert.user_id = r[0]["user_id"].as<std::string>();
            updated_alert.system_id = r[0]["system_id"].as<std::string>();
            updated_alert.metric_name = r[0]["metric_name"].as<std::string>();
            updated_alert.threshold_value = r[0]["threshold_value"].as<double>();
            updated_alert.comparison_operator = string_to_comparison_operator(r[0]["comparison_operator"].as<std::string>());
            updated_alert.status = r[0]["status"].as<std::string>();
            updated_alert.alert_message = r[0]["alert_message"].is_null() ? std::nullopt : std::make_optional(r[0]["alert_message"].as<std::string>());
            updated_alert.created_at = r[0]["created_at"].as<std::string>();
            updated_alert.updated_at = r[0]["updated_at"].as<std::string>();

            LOG_INFO("Alert {} updated for user {}.", alert_id, user_id);
            return updated_alert;

        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error updating alert {}: {}. Query: {}", alert_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error updating alert.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error updating alert {}: {}", alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during alert update.");
        }
    }

    // Delete an alert
    void delete_alert(const std::string& user_id, const std::string& alert_id) {
        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(
                "DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING id",
                alert_id, user_id
            );
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::NOT_FOUND, "Alert not found or not owned by user.");
            }
            LOG_INFO("Alert {} deleted for user {}.", alert_id, user_id);
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error deleting alert {}: {}. Query: {}", alert_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error deleting alert.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error deleting alert {}: {}", alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during alert deletion.");
        }
    }

    // --- Alert Checking Logic ---
    // This method would typically be called by a background worker or cron job.
    // For this example, we demonstrate it as a callable function.
    std::vector<AlertHistory> check_and_trigger_alerts(const std::string& system_id, const std::string& metric_name, double current_value) {
        std::vector<AlertHistory> triggered_histories;

        // Fetch active alerts for this system and metric
        std::string query = "SELECT id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message FROM alerts WHERE system_id = $1 AND metric_name = $2 AND status = 'active'";
        
        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result alerts_result = n.exec_params(query, system_id, metric_name);

            for (const auto& row : alerts_result) {
                Alert alert;
                alert.id = row["id"].as<std::string>();
                alert.user_id = row["user_id"].as<std::string>();
                alert.system_id = row["system_id"].as<std::string>();
                alert.metric_name = row["metric_name"].as<std::string>();
                alert.threshold_value = row["threshold_value"].as<double>();
                alert.comparison_operator = string_to_comparison_operator(row["comparison_operator"].as<std::string>());
                alert.status = row["status"].as<std::string>();
                alert.alert_message = row["alert_message"].is_null() ? std::nullopt : std::make_optional(row["alert_message"].as<std::string>());

                bool trigger = false;
                switch (alert.comparison_operator) {
                    case ComparisonOperator::GREATER_THAN:       trigger = (current_value > alert.threshold_value); break;
                    case ComparisonOperator::LESS_THAN:          trigger = (current_value < alert.threshold_value); break;
                    case ComparisonOperator::GREATER_THAN_EQUAL: trigger = (current_value >= alert.threshold_value); break;
                    case ComparisonOperator::LESS_THAN_EQUAL:    trigger = (current_value <= alert.threshold_value); break;
                    case ComparisonOperator::EQUAL:              trigger = (current_value == alert.threshold_value); break;
                    case ComparisonOperator::NOT_EQUAL:          trigger = (current_value != alert.threshold_value); break;
                }

                if (trigger) {
                    LOG_WARN("ALERT TRIGGERED! Alert ID: {}, System: {}, Metric: {}, Value: {}, Threshold: {}",
                             alert.id, system_id, metric_name, current_value, alert.threshold_value);
                    
                    std::string history_id = Crypto::generate_uuid();
                    std::string message = alert.alert_message ? *alert.alert_message :
                                          "Alert triggered for " + metric_name + " with value " + std::to_string(current_value);

                    try {
                        pqxx::work w_history(*db_conn);
                        pqxx::result history_r = w_history.exec_params(
                            "INSERT INTO alert_history (id, alert_id, actual_value, message) VALUES ($1, $2, $3, $4) RETURNING id, alert_id, triggered_at, actual_value, message",
                            history_id, alert.id, current_value, message
                        );
                        w_history.commit();

                        if (!history_r.empty()) {
                            AlertHistory history_entry;
                            history_entry.id = history_r[0]["id"].as<std::string>();
                            history_entry.alert_id = history_r[0]["alert_id"].as<std::string>();
                            history_entry.triggered_at = history_r[0]["triggered_at"].as<std::string>();
                            history_entry.actual_value = history_r[0]["actual_value"].as<double>();
                            history_entry.message = history_r[0]["message"].as<std::string>();
                            triggered_histories.push_back(history_entry);
                        }
                    } catch (const pqxx::sql_error& e) {
                        LOG_ERROR("SQL Error recording alert history for alert {}: {}. Query: {}", alert.id, e.what(), e.query());
                    } catch (const std::exception& e) {
                        LOG_ERROR("Error recording alert history for alert {}: {}", alert.id, e.what());
                    }
                }
            }
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error checking alerts for system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error checking alerts.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error checking alerts for system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during alert checking.");
        }
        return triggered_histories;
    }

    // Get alert history for a specific alert
    std::vector<AlertHistory> get_alert_history(const std::string& user_id, const std::string& alert_id, int limit = 100) {
        std::vector<AlertHistory> histories;
        try {
            pqxx::nontransaction n(*db_conn);
            // First verify user owns the alert
            pqxx::result alert_check = n.exec_params("SELECT id FROM alerts WHERE id = $1 AND user_id = $2", alert_id, user_id);
            if (alert_check.empty()) {
                throw ApiException(crow::NOT_FOUND, "Alert not found or not owned by user.");
            }

            pqxx::result r = n.exec_params(
                "SELECT id, alert_id, triggered_at, actual_value, message FROM alert_history WHERE alert_id = $1 ORDER BY triggered_at DESC LIMIT $2",
                alert_id, limit
            );

            for (const auto& row : r) {
                AlertHistory history_entry;
                history_entry.id = row["id"].as<std::string>();
                history_entry.alert_id = row["alert_id"].as<std::string>();
                history_entry.triggered_at = row["triggered_at"].as<std::string>();
                history_entry.actual_value = row["actual_value"].as<double>();
                history_entry.message = row["message"].as<std::string>();
                histories.push_back(history_entry);
            }
            LOG_DEBUG("Retrieved {} alert histories for alert {}.", histories.size(), alert_id);
            return histories;
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error fetching alert history for alert {}: {}. Query: {}", alert_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching alert history.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching alert history for alert {}: {}", alert_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }


private:
    std::shared_ptr<pqxx::connection> db_conn;
    std::unique_ptr<MetricService> metric_service; // To interact with metrics for alert checking
};

#endif // ALERTSERVICE_H
```