#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../../src/models/User.h"
#include "../../src/logger/Logger.h"
#include <nlohmann/json.hpp>

// Initialize logger for tests if not already initialized
// This should ideally be done once for all tests in a global setup fixture
struct GlobalTestSetup : public ::testing::Environment {
    void SetUp() override {
        Logger::init_logger("debug"); // Or another level suitable for tests
        Logger::get_logger()->info("Global test setup: Logger initialized.");
    }
    void TearDown() override {
        Logger::get_logger()->info("Global test teardown.");
    }
};

// Add this line to main test runner to register the global setup
// int main(int argc, char **argv) {
//     ::testing::AddGlobalTestEnvironment(new GlobalTestSetup);
//     ::testing::InitGoogleMock(&argc, argv);
//     return RUN_ALL_TESTS();
// }

TEST(UserTest, UserCreationWithDefaultRole) {
    User user("testuser", "test@example.com", "hashed_password", "Test");
    ASSERT_FALSE(user.id.empty());
    ASSERT_EQ(user.username, "testuser");
    ASSERT_EQ(user.email, "test@example.com");
    ASSERT_EQ(user.password_hash, "hashed_password");
    ASSERT_EQ(user.first_name, "Test");
    ASSERT_EQ(user.role, UserRole::CUSTOMER);
    ASSERT_FALSE(user.last_name.has_value());
    ASSERT_FALSE(user.phone_number.has_value());
    ASSERT_FALSE(user.address.has_value());
}

TEST(UserTest, UserCreationWithAdminRole) {
    User user("adminuser", "admin@example.com", "admin_hash", "Admin", UserRole::ADMIN);
    ASSERT_EQ(user.role, UserRole::ADMIN);
}

TEST(UserTest, UserToJsonConversion) {
    User user("testuser", "test@example.com", "hashed_password", "Test");
    user.last_name = "User";
    user.phone_number = "123-456-7890";

    nlohmann::json user_json = user.toJson();

    ASSERT_EQ(user_json["id"], user.id);
    ASSERT_EQ(user_json["username"], "testuser");
    ASSERT_EQ(user_json["email"], "test@example.com");
    ASSERT_EQ(user_json["first_name"], "Test");
    ASSERT_EQ(user_json["last_name"], "User");
    ASSERT_EQ(user_json["phone_number"], "123-456-7890");
    ASSERT_EQ(user_json["role"], "customer");
    ASSERT_TRUE(user_json.contains("created_at"));
    ASSERT_TRUE(user_json.contains("updated_at"));
}

TEST(UserTest, UserFromJsonConversion) {
    nlohmann::json input_json = {
        {"username", "newuser"},
        {"email", "new@example.com"},
        {"password", "SecureP@ss123"},
        {"first_name", "New"},
        {"last_name", "User"},
        {"role", "admin"} // This will be handled by service for hashing, model just takes it
    };

    User user = User::fromJson(input_json); // Password hash will be temp, as it's done in service

    ASSERT_EQ(user.username, "newuser");
    ASSERT_EQ(user.email, "new@example.com");
    ASSERT_EQ(user.first_name, "New");
    ASSERT_EQ(user.last_name.value(), "User");
    ASSERT_EQ(user.role, UserRole::ADMIN); // fromJson should respect role if provided
}

TEST(UserTest, UserFromJsonMissingRequiredFields) {
    nlohmann::json input_json = {
        {"username", "incomplete"}
        // Missing email, password, first_name
    };
    ASSERT_THROW({
        User::fromJson(input_json);
    }, std::runtime_error); // fromJson throws runtime_error for missing fields
}

TEST(UserTest, UserFromSqlConversion) {
    std::string id = "test_id_sql";
    std::string username = "sqluser";
    std::string email = "sql@example.com";
    std::string password_hash = "hashed_from_sql";
    std::string role_str = "customer";
    std::string first_name = "SQL";
    std::optional<std::string> last_name = "User";
    std::optional<std::string> phone_number = "987-654-3210";
    std::optional<std::string> address = "101 SQL Way";
    std::string created_at_str = "2023-01-01T10:00:00Z";
    std::string updated_at_str = "2023-01-02T11:30:00Z";

    User user = User::fromSql(id, username, email, password_hash, role_str,
                              first_name, last_name, phone_number, address,
                              created_at_str, updated_at_str);

    ASSERT_EQ(user.id, id);
    ASSERT_EQ(user.username, username);
    ASSERT_EQ(user.email, email);
    ASSERT_EQ(user.password_hash, password_hash);
    ASSERT_EQ(user.role, UserRole::CUSTOMER);
    ASSERT_EQ(user.first_name, first_name);
    ASSERT_EQ(user.last_name.value(), *last_name);
    ASSERT_EQ(user.phone_number.value(), *phone_number);
    ASSERT_EQ(user.address.value(), *address);
    // Cannot directly compare time_points easily, but toJson can verify format
    ASSERT_EQ(user.to_iso_string(user.created_at), created_at_str);
    ASSERT_EQ(user.to_iso_string(user.updated_at), updated_at_str);
}