```cpp
#include <catch2/catch_all.hpp>
#include <pqxx/pqxx>
#include <memory>
#include <chrono>
#include <thread>

#include "../../src/database/DbConnection.h"
#include "../../src/utils/Logger.h"
#include "../../src/config/AppConfig.h"
#include "../../src/utils/Crypto.h" // For UUID

// Global setup for database connection pool for integration tests
// Ensure a real PostgreSQL instance is running and accessible as per .env settings.
struct GlobalDbSetup {
    GlobalDbSetup() {
        Logger::init();
        AppConfig::load_config(".env.example"); // Load configuration from example
        Crypto::set_jwt_secret("test_secret_key_for_jwt"); // Set a secret for testing

        // Use a test-specific database name to avoid conflicts with development/production
        // For simplicity, we'll reuse the default name here but note the best practice.
        // It's ideal to create and drop a test database for each run.
        try {
            LOG_INFO("Initializing DB for integration tests...");
            // Temporarily connect as postgres user to drop/create the test database
            pqxx::connection admin_conn(
                "host=" + AppConfig::get_db_host() +
                " port=" + std::to_string(AppConfig::get_db_port()) +
                " dbname=postgres user=postgres password=" + AppConfig::get_db_password()
            );
            pqxx::work admin_w(admin_conn);
            admin_w.exec("DROP DATABASE IF EXISTS " + AppConfig::get_db_name() + " WITH (FORCE)");
            admin_w.exec("CREATE DATABASE " + AppConfig::get_db_name());
            admin_w.commit();
            admin_conn.disconnect();
            LOG_INFO("Test database '{}' reset.", AppConfig::get_db_name());

            // Initialize the main connection pool for the app's user
            DbConnection::init_pool(
                AppConfig::get_db_host(),
                AppConfig::get_db_port(),
                AppConfig::get_db_name(),
                AppConfig::get_db_user(),
                AppConfig::get_db_password(),
                AppConfig::get_db_pool_size()
            );
            DbConnection::apply_migrations();
            DbConnection::seed_data(); // Seed test data
            LOG_INFO("DB for integration tests initialized and migrated.");
        } catch (const pqxx::sql_error& e) {
            LOG_CRITICAL("Integration Test DB SQL Error: {}. Query: {}", e.what(), e.query());
            // It's critical if DB setup fails, so re-throw. Catch2 will mark tests as failed.
            throw;
        } catch (const std::exception& e) {
            LOG_CRITICAL("Integration Test DB Setup Error: {}", e.what());
            throw;
        }
    }

    ~GlobalDbSetup() {
        LOG_INFO("Shutting down DB for integration tests...");
        DbConnection::shutdown_pool();
        // Optionally drop the test database again after all tests
        try {
            pqxx::connection admin_conn(
                "host=" + AppConfig::get_db_host() +
                " port=" + std::to_string(AppConfig::get_db_port()) +
                " dbname=postgres user=postgres password=" + AppConfig::get_db_password()
            );
            pqxx::work admin_w(admin_conn);
            admin_w.exec("DROP DATABASE IF EXISTS " + AppConfig::get_db_name() + " WITH (FORCE)");
            admin_w.commit();
            admin_conn.disconnect();
            LOG_INFO("Test database '{}' dropped.", AppConfig::get_db_name());
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to drop test database: {}", e.what());
        }
    }
};

static GlobalDbSetup global_db_setup; // This will run once before all tests

TEST_CASE("DbConnection pool and migration", "[db][integration]") {
    SECTION("Get and release connection") {
        auto conn1 = DbConnection::get_connection();
        REQUIRE(conn1->is_open());
        DbConnection::release_connection(conn1);

        auto conn2 = DbConnection::get_connection();
        REQUIRE(conn2->is_open());
        DbConnection::release_connection(conn2);
    }

    SECTION("Migrations applied successfully") {
        auto conn = DbConnection::get_connection();
        pqxx::nontransaction n(*conn);
        
        // Check for tables created by V1 migration
        pqxx::result r_users = n.exec("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')");
        REQUIRE(r_users[0][0].as<bool>() == true);
        pqxx::result r_systems = n.exec("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'systems')");
        REQUIRE(r_systems[0][0].as<bool>() == true);
        pqxx::result r_metrics = n.exec("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'metrics')");
        REQUIRE(r_metrics[0][0].as<bool>() == true);

        // Check for tables created by V2 migration
        pqxx::result r_alerts = n.exec("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alerts')");
        REQUIRE(r_alerts[0][0].as<bool>() == true);
        pqxx::result r_alert_history = n.exec("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_history')");
        REQUIRE(r_alert_history[0][0].as<bool>() == true);

        // Check for schema_migrations table
        pqxx::result r_schema_migrations = n.exec("SELECT COUNT(*) FROM schema_migrations");
        REQUIRE(r_schema_migrations[0][0].as<long>() >= 2); // Should have at least V1 and V2
        
        DbConnection::release_connection(conn);
    }

    SECTION("Seed data present") {
        auto conn = DbConnection::get_connection();
        pqxx::nontransaction n(*conn);
        
        pqxx::result r_users = n.exec("SELECT COUNT(*) FROM users WHERE email = 'admin@example.com'");
        REQUIRE(r_users[0][0].as<long>() == 1);

        pqxx::result r_systems = n.exec("SELECT COUNT(*) FROM systems WHERE name = 'Main Web Server'");
        REQUIRE(r_systems[0][0].as<long>() == 1);

        pqxx::result r_metrics = n.exec("SELECT COUNT(*) FROM metrics WHERE system_id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'");
        REQUIRE(r_metrics[0][0].as<long>() >= 1); // At least one metric should be there

        pqxx::result r_alerts = n.exec("SELECT COUNT(*) FROM alerts WHERE metric_name = 'cpu_usage'");
        REQUIRE(r_alerts[0][0].as<long>() == 1);

        DbConnection::release_connection(conn);
    }
}
```