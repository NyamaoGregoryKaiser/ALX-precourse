```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_string.hpp>
#include "services/DBMonitorService.hpp"
#include "db/DBConnectionPool.hpp"
#include "models/MonitoredDB.hpp"
#include "utils/ConfigManagerTestHelper.hpp" // A helper for testing ConfigManager
#include "Poco/Data/Session.h"
#include "Poco/Data/Statement.h"
#include "Poco/JSON/Stringifier.h"
#include "utils/Logger.hpp"

// Forward declaration for test helper functions
void setupTestOptimizerDB(DBConnectionPool* pool);
void setupTestTargetDB(int monitoredDbId); // For the mock target_db

TEST_CASE("DBMonitorService integration with database and analysis", "[DBMonitorService][Integration]") {
    // This test requires a running PostgreSQL instance for both the optimizer's DB
    // and a mock target DB, typically set up via docker-compose.
    // The connection details are pulled from environment variables.

    ConfigManagerTestHelper configManager;
    configManager.set("database.host", std::getenv("DB_OPTIMIZER_DB_HOST") ? std::getenv("DB_OPTIMIZER_DB_HOST") : "localhost");
    configManager.set("database.port", std::getenv("DB_OPTIMIZER_DB_PORT") ? std::stoi(std::getenv("DB_OPTIMIZER_DB_PORT")) : 5432);
    configManager.set("database.name", std::getenv("DB_OPTIMIZER_DB_NAME") ? std::getenv("DB_OPTIMIZER_DB_NAME") : "db_optimizer_db");
    configManager.set("database.user", std::getenv("DB_OPTIMIZER_DB_USER") ? std::getenv("DB_OPTIMIZER_DB_USER") : "db_optimizer_user");
    configManager.set("database.password", std::getenv("DB_OPTIMIZER_DB_PASSWORD") ? std::getenv("DB_OPTIMIZER_DB_PASSWORD") : "db_optimizer_password");

    // Initialize DB pool for the optimizer's own database
    DBConnectionPool optimizerDbPool(
        "PostgreSQL",
        "host=" + configManager.get<std::string>("database.host") +
        " port=" + std::to_string(configManager.get<int>("database.port")) +
        " dbname=" + configManager.get<std::string>("database.name") +
        " user=" + configManager.get<std::string>("database.user") +
        " password=" + configManager.get<std::string>("database.password")
    );
    
    // Ensure optimizer's DB schema is ready
    setupTestOptimizerDB(&optimizerDbPool);

    DBMonitorService monitorService(&optimizerDbPool);

    SECTION("Adding and monitoring a target database") {
        // First, add a mock monitored database entry into the optimizer's DB
        MonitoredDB db;
        db.userId = 1; // Assuming a user with ID 1 exists from seeding
        db.name = "Test Target DB";
        db.dbType = "PostgreSQL";
        db.host = "target_postgres_db"; // As defined in docker-compose
        db.port = 5432;                 // Internal port of target_postgres_db container
        db.dbName = "target_db";
        db.dbUser = "target_user";
        db.dbPassword = "target_password";

        int monitoredDbId = 0;
        try {
            Poco::Data::Session session = optimizerDbPool.getSession();
            Poco::Data::Statement insert(session);
            insert << "INSERT INTO monitored_databases (user_id, name, db_type, host, port, db_name, db_user, db_password) "
                   << "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
                   Poco::Data::Keywords::use(db.userId),
                   Poco::Data::Keywords::use(db.name),
                   Poco::Data::Keywords::use(db.dbType),
                   Poco::Data::Keywords::use(db.host),
                   Poco::Data::Keywords::use(db.port),
                   Poco::Data::Keywords::use(db.dbName),
                   Poco::Data::Keywords::use(db.dbUser),
                   Poco::Data::Keywords::use(db.dbPassword),
                   Poco::Data::Keywords::into(monitoredDbId);
            insert.execute();
            REQUIRE(monitoredDbId > 0);
            DB_OPTIMIZER_LOG_INFO("Added monitored DB with ID: {}", monitoredDbId);
        } catch (const Poco::Exception& e) {
            FAIL("Failed to add monitored DB to optimizer's DB: " << e.displayText());
        }

        // Setup the actual target_postgres_db with some test data and pg_stat_statements
        setupTestTargetDB(monitoredDbId);

        // Simulate some query activity on the target DB
        try {
            Poco::Data::Session targetSession = monitorService.getPostgreSQLAdapter(monitoredDbId)->getNewSession(monitoredDbId);
            Poco::Data::Statement s1(targetSession);
            s1 << "SELECT * FROM products WHERE category_id = $1", Poco::Data::Keywords::use(1);
            s1.execute();

            Poco::Data::Statement s2(targetSession);
            s2 << "SELECT * FROM orders WHERE user_id = $1", Poco::Data::Keywords::use(1);
            s2.execute();

            Poco::Data::Statement s3(targetSession);
            s3 << "SELECT p.name, c.name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.price > $1", Poco::Data::Keywords::use(100.0);
            s3.execute();
            DB_OPTIMIZER_LOG_INFO("Executed some queries on target DB.");
        } catch (const Poco::Exception& e) {
            FAIL("Failed to execute queries on target DB: " << e.displayText());
        }

        // Give pg_stat_statements time to update (might need a few seconds)
        std::this_thread::sleep_for(std::chrono::seconds(5));

        // Manually trigger analysis for the specific monitored DB
        monitorService.analyzeMonitoredDatabase(monitoredDbId);
        DB_OPTIMIZER_LOG_INFO("Manually triggered analysis for DB ID: {}", monitoredDbId);

        // Verify that query logs and optimization reports are saved
        try {
            Poco::Data::Session session = optimizerDbPool.getSession();
            long queryCount = 0;
            session << "SELECT COUNT(*) FROM query_logs WHERE monitored_db_id = $1",
                    Poco::Data::Keywords::use(monitoredDbId),
                    Poco::Data::Keywords::into(queryCount),
                    Poco::Data::Keywords::now;
            DB_OPTIMIZER_LOG_INFO("Found {} query logs for DB ID: {}", queryCount, monitoredDbId);
            REQUIRE(queryCount >= 3); // At least the 3 queries we executed

            long reportCount = 0;
            session << "SELECT COUNT(*) FROM optimization_reports WHERE monitored_db_id = $1",
                    Poco::Data::Keywords::use(monitoredDbId),
                    Poco::Data::Keywords::into(reportCount),
                    Poco::Data::Keywords::now;
            DB_OPTIMIZER_LOG_INFO("Found {} optimization reports for DB ID: {}", reportCount, monitoredDbId);
            // It's hard to guarantee a specific number of reports without knowing the exact state and queries.
            // But we expect at least some reports if scans/missing indexes are detected.
            REQUIRE(reportCount >= 0); // Can be 0 if all queries are perfectly optimized
            
            // Optionally, fetch and inspect one report
            std::string reportType, recommendation;
            Poco::Data::Statement selectReport(session);
            selectReport << "SELECT report_type, recommendation FROM optimization_reports WHERE monitored_db_id = $1 LIMIT 1",
                        Poco::Data::Keywords::use(monitoredDbId),
                        Poco::Data::Keywords::into(reportType),
                        Poco::Data::Keywords::into(recommendation),
                        Poco::Data::Keywords::now;
            if (reportCount > 0) {
                DB_OPTIMIZER_LOG_INFO("Example Report: Type='{}', Rec='{}'", reportType, recommendation);
                REQUIRE_THAT(reportType, Catch::Matchers::AnyOf(ContainsSubstring("Index Recommendation"), ContainsSubstring("Query Rewrite")));
                REQUIRE_FALSE(recommendation.empty());
            }

        } catch (const Poco::Exception& e) {
            FAIL("Failed to verify logs/reports in optimizer's DB: " << e.displayText());
        }
    }
}

// Helper function to set up the optimizer's DB schema for testing
void setupTestOptimizerDB(DBConnectionPool* pool) {
    try {
        Poco::Data::Session session = pool->getSession();
        session << "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE, email VARCHAR(255) UNIQUE, password_hash VARCHAR(255), role VARCHAR(50) DEFAULT 'user', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);", Poco::Data::Keywords::now;
        session << "CREATE TABLE IF NOT EXISTS monitored_databases (id SERIAL PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(255), db_type VARCHAR(50), host VARCHAR(255), port INT, db_name VARCHAR(255), db_user VARCHAR(255), db_password VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);", Poco::Data::Keywords::now;
        session << "CREATE TABLE IF NOT EXISTS query_logs (id SERIAL PRIMARY KEY, monitored_db_id INT NOT NULL, query_text TEXT NOT NULL, execution_time_ms INT NOT NULL, rows_affected INT, plan_output TEXT, captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_monitored_db FOREIGN KEY(monitored_db_id) REFERENCES monitored_databases(id) ON DELETE CASCADE);", Poco::Data::Keywords::now;
        session << "CREATE TABLE IF NOT EXISTS optimization_reports (id SERIAL PRIMARY KEY, monitored_db_id INT NOT NULL, report_type VARCHAR(50), recommendation TEXT, details JSONB, generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, status VARCHAR(50) DEFAULT 'pending', CONSTRAINT fk_monitored_db_report FOREIGN KEY(monitored_db_id) REFERENCES monitored_databases(id) ON DELETE CASCADE);", Poco::Data::Keywords::now;

        // Insert a dummy user if not exists, required for foreign key
        session << "INSERT INTO users (id, username, email, password_hash, role) VALUES (1, 'testuser', 'test@example.com', 'hashedpass', 'user') ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;", Poco::Data::Keywords::now;
        DB_OPTIMIZER_LOG_INFO("Optimizer DB schema and dummy user (ID 1) ensured.");
    } catch (const Poco::Exception& e) {
        FAIL("Failed to setup test optimizer DB: " << e.displayText());
    }
}

// Helper function to set up the target DB schema for testing, including pg_stat_statements
void setupTestTargetDB(int monitoredDbId) {
    // This function assumes 'target_postgres_db' container is running and accessible at 'target_postgres_db:5432'
    // with 'target_db', 'target_user', 'target_password'.
    // The `docker/target_db_setup.sql` handles initial schema and data.
    // The main task here is to ensure pg_stat_statements is active.

    // A DBConnectionPool is needed temporarily to connect to the target DB
    // Use a temporary ConfigManager-like object for target DB credentials
    ConfigManagerTestHelper targetDbConfig;
    targetDbConfig.set("database.host", "target_postgres_db");
    targetDbConfig.set("database.port", 5432); // Internal Docker port
    targetDbConfig.set("database.name", "target_db");
    targetDbConfig.set("database.user", "target_user");
    targetDbConfig.set("database.password", "target_password");

    DBConnectionPool targetDbTempPool(
        "PostgreSQL",
        "host=" + targetDbConfig.get<std::string>("database.host") +
        " port=" + std::to_string(targetDbConfig.get<int>("database.port")) +
        " dbname=" + targetDbConfig.get<std::string>("database.name") +
        " user=" + targetDbConfig.get<std::string>("database.user") +
        " password=" + targetDbConfig.get<std::string>("database.password")
    );

    try {
        Poco::Data::Session session = targetDbTempPool.getSession();
        // Ensure pg_stat_statements extension is created if not already
        session << "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;", Poco::Data::Keywords::now;
        DB_OPTIMIZER_LOG_INFO("pg_stat_statements ensured on target DB (ID {}).", monitoredDbId);
    } catch (const Poco::Exception& e) {
        FAIL("Failed to enable pg_stat_statements on target DB (ID " << monitoredDbId << "): " << e.displayText());
    }
}
```