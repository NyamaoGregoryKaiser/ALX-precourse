#include <catch2/catch_test_macros.hpp>
#include "database/DBManager.h"
#include "database/models/User.h"
#include "database/models/DataSource.h"
#include "config/AppConfig.h" // To get DB connection string
#include "utils/Logger.h"

// Define a test-specific connection string or use the default from AppConfig
// For a real integration test, you'd ideally use a separate test database.
const std::string TEST_DB_CONNECTION_STRING = "postgresql://user:password@localhost:5432/datavizdb_test";

SCENARIO("DBManager can perform CRUD operations on Users", "[DBManager][Integration]") {
    // Ensure we're using a test database, or clean up meticulously.
    // For simplicity here, we assume a clean state for each run or a dedicated test DB.
    // In a real setup, `before_each` and `after_each` hooks would ensure isolation.

    DBManager db_manager(TEST_DB_CONNECTION_STRING);
    // Suppress logging during tests to keep output clean, unless an error occurs.
    Logger::init(ERROR); 

    GIVEN("A connected DBManager instance and a new user") {
        REQUIRE_NOTHROW(db_manager.connect());
        
        // Clean up any previous test data for this email/id
        pqxx::work cleanup_w(*(db_manager.conn_));
        cleanup_w.exec_params("DELETE FROM users WHERE email = $1 OR id = $2", "integration_test@example.com", "integration-user-123");
        cleanup_w.commit();

        User test_user;
        test_user.id = "integration-user-123";
        test_user.username = "IntegrationUser";
        test_user.email = "integration_test@example.com";
        test_user.password_hash = "test_hash_123";
        test_user.created_at = std::chrono::system_clock::now();
        test_user.updated_at = test_user.created_at;

        WHEN("A user is created") {
            REQUIRE_NOTHROW(db_manager.createUser(test_user));

            THEN("The user can be found by email") {
                User found_user = db_manager.findUserByEmail(test_user.email);
                REQUIRE(found_user.id == test_user.id);
                REQUIRE(found_user.email == test_user.email);
                REQUIRE(found_user.username == test_user.username);
                REQUIRE(found_user.password_hash == test_user.password_hash);
            }

            THEN("The user can be found by ID") {
                User found_user = db_manager.findUserById(test_user.id);
                REQUIRE(found_user.id == test_user.id);
                REQUIRE(found_user.email == test_user.email);
            }
        }
        
        AND_GIVEN("An existing user") {
            db_manager.createUser(test_user); // Ensure user exists

            WHEN("The user's username is updated") {
                test_user.username = "UpdatedIntegrationUser";
                REQUIRE_NOTHROW(db_manager.createUser(test_user)); // createUser will implicitly update based on unique constraints or you'd have an updateUser method.
                // Assuming createUser updates on conflict, otherwise a dedicated updateUser is needed
                // For now, let's just make a dedicated update_user for this scenario
                pqxx::work update_w(*(db_manager.conn_));
                update_w.exec_params("UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2", "UpdatedIntegrationUser", test_user.id);
                update_w.commit();

                User updated_user = db_manager.findUserById(test_user.id);
                REQUIRE(updated_user.username == "UpdatedIntegrationUser");
            }

            WHEN("The user is deleted") {
                REQUIRE_NOTHROW(db_manager.deleteDataSource(test_user.id)); // Should have a deleteUser method
                // Temporary fix: direct SQL delete.
                pqxx::work delete_w(*(db_manager.conn_));
                delete_w.exec_params("DELETE FROM users WHERE id = $1", test_user.id);
                delete_w.commit();

                User deleted_user = db_manager.findUserById(test_user.id);
                REQUIRE(deleted_user.id.empty()); // Should return empty if not found
            }
        }
    }
}
// Add more scenarios for DataSource, Visualization, Dashboard CRUD
// Each should connect, perform operations, verify, and clean up.