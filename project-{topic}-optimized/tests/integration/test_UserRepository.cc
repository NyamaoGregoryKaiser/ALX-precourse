#include <catch2/catch_test_macros.hpp>
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>
#include <drogon/orm/Exception.h>
#include "repositories/UserRepository.h"
#include "models/User.h"
#include "utils/AppConfig.h" // To load DB config
#include "utils/CryptoUtils.h" // For password hashing
#include "middleware/ErrorHandler.h" // For ConflictError
#include <thread>
#include <chrono>
#include <spdlog/spdlog.h>

// A test fixture to ensure Drogon and DB client are initialized
struct DrogonDbFixture {
    drogon::orm::DbClientPtr dbClient;
    std::string db_conn_name;
    static bool drogon_initialized;

    DrogonDbFixture() {
        if (!drogon_initialized) {
            // Load config if not already loaded (e.g., by main or other tests)
            const std::string config_path = "../../config/app_config.json"; // Path relative to build/tests/integration
            if (!AppConfig::getInstance().load(config_path)) {
                FAIL("Failed to load application configuration for tests.");
            }

            // Manually configure Drogon for testing if not already running
            if (!drogon::app().isRunning()) {
                spdlog::info("Initializing Drogon for tests...");
                auto& config = AppConfig::getInstance();
                drogon::app().addListener(config.getString("server_host"), 0); // Use port 0 for random port in tests
                drogon::app().setThreadNum(1); // Single thread for deterministic testing
                drogon::app().enablePostgreSQL(
                    config.getString("db_host"),
                    config.getInt("db_port"),
                    config.getString("db_user"),
                    config.getString("db_password"),
                    config.getString("db_name"),
                    1, // Use a small connection pool for tests
                    config.getString("db_connection_name")
                );
                drogon::app().loadConfigJson(config_path); // Loads config from the path
                // Start a detached thread for Drogon app to run in the background
                // This is a common pattern for integration tests with frameworks
                drogon::app().enableIdleFunction([](){/* keep alive */}); // Prevent premature exit
                drogon::app().run(); // Run will block, so we need a separate thread
                spdlog::info("Drogon initialized and running in background.");
            }
            drogon_initialized = true;
        }

        db_conn_name = AppConfig::getInstance().getString("db_connection_name");
        dbClient = drogon::app().getDbClient(db_conn_name);
        REQUIRE(dbClient != nullptr);

        // Clean up users table before each test for isolation
        try {
            dbClient->execSqlSync("DELETE FROM users");
            dbClient->execSqlSync("ALTER SEQUENCE users_id_seq RESTART WITH 1"); // Reset ID sequence
            spdlog::info("Cleaned up 'users' table and reset sequence.");
        } catch (const drogon::orm::DrogonDbException& e) {
            FAIL("Failed to clean up database for tests: " + std::string(e.what()));
        }
    }

    // You might want to stop Drogon here, but for multiple test files,
    // it's often better to let it run and clean up once at the very end
    // of all tests (e.g., using a global fixture in Catch2 if needed).
    // For simplicity, we'll keep it running.
};
bool DrogonDbFixture::drogon_initialized = false; // Static member initialization

TEST_CASE_METHOD(DrogonDbFixture, "UserRepository CRUD Operations", "[UserRepository][Integration]") {
    repositories::UserRepository userRepo(dbClient);

    SECTION("Create User") {
        models::User newUser;
        newUser.username = "test_user_create";
        newUser.email = "create@example.com";
        newUser.passwordSalt = CryptoUtils::generateSalt();
        newUser.passwordHash = CryptoUtils::generateHash("password", newUser.passwordSalt);
        newUser.role = "user";

        long long id = userRepo.create(newUser);
        REQUIRE(id > 0);

        auto fetchedUser = userRepo.findById(id);
        REQUIRE(fetchedUser.has_value());
        REQUIRE(fetchedUser->username == newUser.username);
        REQUIRE(fetchedUser->email == newUser.email);
        REQUIRE(fetchedUser->passwordHash == newUser.passwordHash);
        REQUIRE(fetchedUser->role == newUser.role);
    }

    SECTION("Create User with duplicate username fails") {
        models::User user1;
        user1.username = "duplicate_user";
        user1.email = "dup1@example.com";
        user1.passwordSalt = CryptoUtils::generateSalt();
        user1.passwordHash = CryptoUtils::generateHash("password", user1.passwordSalt);
        user1.role = "user";
        userRepo.create(user1); // First user creation succeeds

        models::User user2;
        user2.username = "duplicate_user"; // Same username
        user2.email = "dup2@example.com";
        user2.passwordSalt = CryptoUtils::generateSalt();
        user2.passwordHash = CryptoUtils::generateHash("password", user2.passwordSalt);
        user2.role = "user";

        REQUIRE_THROWS_AS(userRepo.create(user2), ConflictError);
    }

    SECTION("Create User with duplicate email fails") {
        models::User user1;
        user1.username = "user_dup_email_1";
        user1.email = "dup@example.com";
        user1.passwordSalt = CryptoUtils::generateSalt();
        user1.passwordHash = CryptoUtils::generateHash("password", user1.passwordSalt);
        user1.role = "user";
        userRepo.create(user1);

        models::User user2;
        user2.username = "user_dup_email_2";
        user2.email = "dup@example.com"; // Same email
        user2.passwordSalt = CryptoUtils::generateSalt();
        user2.passwordHash = CryptoUtils::generateHash("password", user2.passwordSalt);
        user2.role = "user";

        REQUIRE_THROWS_AS(userRepo.create(user2), ConflictError);
    }

    SECTION("Find User by username") {
        models::User newUser;
        newUser.username = "find_by_username";
        newUser.email = "find_by_username@example.com";
        newUser.passwordSalt = CryptoUtils::generateSalt();
        newUser.passwordHash = CryptoUtils::generateHash("password", newUser.passwordSalt);
        newUser.role = "user";
        userRepo.create(newUser);

        auto foundUser = userRepo.findByUsername("find_by_username");
        REQUIRE(foundUser.has_value());
        REQUIRE(foundUser->username == newUser.username);

        auto notFoundUser = userRepo.findByUsername("non_existent");
        REQUIRE_FALSE(notFoundUser.has_value());
    }

    SECTION("Find User by email") {
        models::User newUser;
        newUser.username = "find_by_email";
        newUser.email = "find_by_email@example.com";
        newUser.passwordSalt = CryptoUtils::generateSalt();
        newUser.passwordHash = CryptoUtils::generateHash("password", newUser.passwordSalt);
        newUser.role = "user";
        userRepo.create(newUser);

        auto foundUser = userRepo.findByEmail("find_by_email@example.com");
        REQUIRE(foundUser.has_value());
        REQUIRE(foundUser->email == newUser.email);

        auto notFoundUser = userRepo.findByEmail("non_existent@example.com");
        REQUIRE_FALSE(notFoundUser.has_value());
    }

    SECTION("Find All Users") {
        userRepo.create({"user1", "user1@example.com", CryptoUtils::generateHash("p1", CryptoUtils::generateSalt()), CryptoUtils::generateSalt(), "user"});
        userRepo.create({"user2", "user2@example.com", CryptoUtils::generateHash("p2", CryptoUtils::generateSalt()), CryptoUtils::generateSalt(), "admin"});

        auto users = userRepo.findAll();
        REQUIRE(users.size() == 2);
    }

    SECTION("Update User") {
        models::User newUser;
        newUser.username = "original_user";
        newUser.email = "original@example.com";
        newUser.passwordSalt = CryptoUtils::generateSalt();
        newUser.passwordHash = CryptoUtils::generateHash("password", newUser.passwordSalt);
        newUser.role = "user";
        long long id = userRepo.create(newUser);

        models::User updatedUser = newUser;
        updatedUser.id = id;
        updatedUser.username = "updated_user";
        updatedUser.email = "updated@example.com";
        updatedUser.role = "admin";

        REQUIRE(userRepo.update(updatedUser));

        auto fetchedUser = userRepo.findById(id);
        REQUIRE(fetchedUser.has_value());
        REQUIRE(fetchedUser->username == updatedUser.username);
        REQUIRE(fetchedUser->email == updatedUser.email);
        REQUIRE(fetchedUser->role == updatedUser.role);
    }

    SECTION("Update non-existent User fails") {
        models::User nonExistentUser;
        nonExistentUser.id = 9999;
        nonExistentUser.username = "no_such_user";
        nonExistentUser.email = "no_such@example.com";
        nonExistentUser.passwordSalt = CryptoUtils::generateSalt();
        nonExistentUser.passwordHash = CryptoUtils::generateHash("password", nonExistentUser.passwordSalt);
        nonExistentUser.role = "user";

        REQUIRE_FALSE(userRepo.update(nonExistentUser));
    }

    SECTION("Delete User") {
        models::User newUser;
        newUser.username = "user_to_delete";
        newUser.email = "delete@example.com";
        newUser.passwordSalt = CryptoUtils::generateSalt();
        newUser.passwordHash = CryptoUtils::generateHash("password", newUser.passwordSalt);
        newUser.role = "user";
        long long id = userRepo.create(newUser);

        REQUIRE(userRepo.remove(id));
        REQUIRE_FALSE(userRepo.findById(id).has_value());
    }

    SECTION("Delete non-existent User fails") {
        REQUIRE_FALSE(userRepo.remove(9999));
    }
}
```

**API Tests (Manual / `curl` examples)**
```bash