```cpp
#include <catch2/catch_all.hpp>
#include <nlohmann/json.hpp>
#include "../../src/models/User.h"
#include "../../src/models/System.h"
#include "../../src/models/Metric.h"
#include "../../src/models/Alert.h"

TEST_CASE("User model JSON serialization/deserialization", "[models][user]") {
    User user;
    user.id = "user-123";
    user.username = "testuser";
    user.email = "test@example.com";
    user.password_hash = "hashed_password"; // Should not be in to_json output
    user.created_at = "2023-01-01T10:00:00Z";
    user.updated_at = "2023-01-01T10:00:00Z";

    SECTION("to_json converts User to JSON correctly") {
        nlohmann::json j = user.to_json();
        REQUIRE(j.at("id") == "user-123");
        REQUIRE(j.at("username") == "testuser");
        REQUIRE(j.at("email") == "test@example.com");
        REQUIRE(j.at("created_at") == "2023-01-01T10:00:00Z");
        REQUIRE(j.at("updated_at") == "2023-01-01T10:00:00Z");
        REQUIRE_FALSE(j.contains("password_hash")); // Password hash should be excluded
    }

    SECTION("from_json converts JSON to User correctly") {
        nlohmann::json j = {
            {"id", "user-456"},
            {"username", "anotheruser"},
            {"email", "another@example.com"},
            {"created_at", "2023-02-01T11:00:00Z"},
            {"updated_at", "2023-02-01T11:00:00Z"}
        };
        User from_j = User::from_json(j);
        REQUIRE(from_j.id == "user-456");
        REQUIRE(from_j.username == "anotheruser");
        REQUIRE(from_j.email == "another@example.com");
        REQUIRE(from_j.created_at == "2023-02-01T11:00:00Z");
        REQUIRE(from_j.updated_at == "2023-02-01T11:00:00Z");
    }
}

TEST_CASE("System model JSON serialization/deserialization", "[models][system]") {
    System system;
    system.id = "system-123";
    system.user_id = "user-abc";
    system.name = "Test Server";
    system.description = "A server for testing purposes.";
    system.api_key = "api-key-xyz";
    system.created_at = "2023-01-01T10:00:00Z";
    system.updated_at = "2023-01-01T10:00:00Z";

    SECTION("to_json converts System to JSON correctly with description") {
        nlohmann::json j = system.to_json();
        REQUIRE(j.at("id") == "system-123");
        REQUIRE(j.at("user_id") == "user-abc");
        REQUIRE(j.at("name") == "Test Server");
        REQUIRE(j.at("description") == "A server for testing purposes.");
        REQUIRE(j.at("api_key") == "api-key-xyz");
    }

    SECTION("to_json converts System to JSON correctly without description") {
        system.description = std::nullopt;
        nlohmann::json j = system.to_json();
        REQUIRE_FALSE(j.contains("description"));
    }

    SECTION("from_json converts JSON to System correctly") {
        nlohmann::json j = {
            {"id", "system-456"},
            {"user_id", "user-def"},
            {"name", "Another Server"},
            {"description", "Another test server."},
            {"api_key", "api-key-uvw"},
            {"created_at", "2023-02-01T11:00:00Z"},
            {"updated_at", "2023-02-01T11:00:00Z"}
        };
        System from_j = System::from_json(j);
        REQUIRE(from_j.id == "system-456");
        REQUIRE(from_j.user_id == "user-def");
        REQUIRE(from_j.name == "Another Server");
        REQUIRE(from_j.description == "Another test server.");
        REQUIRE(from_j.api_key == "api-key-uvw");
    }

    SECTION("from_json converts JSON to System correctly without description") {
        nlohmann::json j = {
            {"id", "system-789"},
            {"user_id", "user-ghi"},
            {"name", "No Desc Server"},
            {"api_key", "api-key-rst"},
            {"created_at", "2023-03-01T12:00:00Z"},
            {"updated_at", "2023-03-01T12:00:00Z"}
        };
        System from_j = System::from_json(j);
        REQUIRE(from_j.description == std::nullopt);
    }
}

TEST_CASE("Metric model JSON serialization/deserialization", "[models][metric]") {
    Metric metric;
    metric.id = "metric-123";
    metric.system_id = "system-abc";
    metric.metric_name = "cpu_usage";
    metric.metric_value = 55.7;
    metric.timestamp = "2023-01-01T10:00:00Z";

    SECTION("to_json converts Metric to JSON correctly") {
        nlohmann::json j = metric.to_json();
        REQUIRE(j.at("id") == "metric-123");
        REQUIRE(j.at("system_id") == "system-abc");
        REQUIRE(j.at("metric_name") == "cpu_usage");
        REQUIRE(j.at("metric_value") == 55.7);
        REQUIRE(j.at("timestamp") == "2023-01-01T10:00:00Z");
    }

    SECTION("from_json converts JSON to Metric correctly") {
        nlohmann::json j = {
            {"id", "metric-456"},
            {"system_id", "system-def"},
            {"metric_name", "memory_free"},
            {"metric_value", 1024.5},
            {"timestamp", "2023-02-01T11:00:00Z"}
        };
        Metric from_j = Metric::from_json(j);
        REQUIRE(from_j.id == "metric-456");
        REQUIRE(from_j.system_id == "system-def");
        REQUIRE(from_j.metric_name == "memory_free");
        REQUIRE(from_j.metric_value == 1024.5);
        REQUIRE(from_j.timestamp == "2023-02-01T11:00:00Z");
    }

    SECTION("AggregatedMetric to_json converts correctly") {
        AggregatedMetric agg_metric;
        agg_metric.metric_name = "cpu_avg";
        agg_metric.time_bucket = "2023-01-01T10:00:00Z";
        agg_metric.min_value = 10.0;
        agg_metric.max_value = 90.0;
        agg_metric.avg_value = 50.0;
        agg_metric.count = 60;

        nlohmann::json j = agg_metric.to_json();
        REQUIRE(j.at("metric_name") == "cpu_avg");
        REQUIRE(j.at("time_bucket") == "2023-01-01T10:00:00Z");
        REQUIRE(j.at("min_value") == 10.0);
        REQUIRE(j.at("max_value") == 90.0);
        REQUIRE(j.at("avg_value") == 50.0);
        REQUIRE(j.at("count") == 60);
    }
}

TEST_CASE("Alert model JSON serialization/deserialization", "[models][alert]") {
    Alert alert;
    alert.id = "alert-123";
    alert.user_id = "user-abc";
    alert.system_id = "system-xyz";
    alert.metric_name = "cpu_usage";
    alert.threshold_value = 80.0;
    alert.comparison_operator = ComparisonOperator::GREATER_THAN;
    alert.status = "active";
    alert.alert_message = "High CPU usage detected!";
    alert.created_at = "2023-01-01T10:00:00Z";
    alert.updated_at = "2023-01-01T10:00:00Z";

    SECTION("ComparisonOperator to/from string works") {
        REQUIRE(comparison_operator_to_string(ComparisonOperator::GREATER_THAN) == ">");
        REQUIRE(comparison_operator_to_string(ComparisonOperator::LESS_THAN) == "<");
        REQUIRE(comparison_operator_to_string(ComparisonOperator::EQUAL) == "=");
        REQUIRE(string_to_comparison_operator(">") == ComparisonOperator::GREATER_THAN);
        REQUIRE(string_to_comparison_operator("<=") == ComparisonOperator::LESS_THAN_EQUAL);
        REQUIRE_THROWS_AS(string_to_comparison_operator("invalid"), std::invalid_argument);
    }

    SECTION("to_json converts Alert to JSON correctly with message") {
        nlohmann::json j = alert.to_json();
        REQUIRE(j.at("id") == "alert-123");
        REQUIRE(j.at("user_id") == "user-abc");
        REQUIRE(j.at("system_id") == "system-xyz");
        REQUIRE(j.at("metric_name") == "cpu_usage");
        REQUIRE(j.at("threshold_value") == 80.0);
        REQUIRE(j.at("comparison_operator") == ">");
        REQUIRE(j.at("status") == "active");
        REQUIRE(j.at("alert_message") == "High CPU usage detected!");
    }

    SECTION("to_json converts Alert to JSON correctly without message") {
        alert.alert_message = std::nullopt;
        nlohmann::json j = alert.to_json();
        REQUIRE_FALSE(j.contains("alert_message"));
    }

    SECTION("from_json converts JSON to Alert correctly") {
        nlohmann::json j = {
            {"id", "alert-456"},
            {"user_id", "user-def"},
            {"system_id", "system-uvw"},
            {"metric_name", "memory_usage"},
            {"threshold_value", 90.0},
            {"comparison_operator", "<="},
            {"status", "inactive"},
            {"alert_message", "Memory critically low!"},
            {"created_at", "2023-02-01T11:00:00Z"},
            {"updated_at", "2023-02-01T11:00:00Z"}
        };
        Alert from_j = Alert::from_json(j);
        REQUIRE(from_j.id == "alert-456");
        REQUIRE(from_j.user_id == "user-def");
        REQUIRE(from_j.system_id == "system-uvw");
        REQUIRE(from_j.metric_name == "memory_usage");
        REQUIRE(from_j.threshold_value == 90.0);
        REQUIRE(from_j.comparison_operator == ComparisonOperator::LESS_THAN_EQUAL);
        REQUIRE(from_j.status == "inactive");
        REQUIRE(from_j.alert_message == "Memory critically low!");
    }
}
```