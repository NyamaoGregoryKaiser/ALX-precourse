```cpp
#include <gtest/gtest.h>
#include "models/User.h"
#include "services/AuthService.h"
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>

// Mock DbClient for unit tests to avoid actual database interaction
class MockDbClient : public drogon::orm::DbClient {
public:
    MockDbClient(const std::string& connInfo) : DbClient(connInfo) {}

    virtual drogon::orm::Future<drogon::orm::Result> execSqlAsync(
        const std::string& sql,
        size_t paramNum,
        const std_ext::shared_ptr<std::vector<char[]>>& params,
        const std_ext::shared_ptr<std::vector<int>>& lengths,
        const std_ext::shared_ptr<std::vector<int>>& formats) override {
        // This is a simplified mock. In a real scenario, you'd
        // inspect 'sql' and 'params' to return appropriate mock data.
        // For basic UserMapper tests, we'll return a predefined user.

        if (sql.find("SELECT") != std::string::npos && sql.find("email = $1") != std::string::npos) {
            // Simulate finding a user by email
            drogon::orm::Result::SizeType rowNum = 1;
            drogon::orm::Result::SizeType colNum = 8;
            auto result = std::make_shared<drogon::orm::Result>(); // This needs to be a real Result or mocked properly
            // Creating a dummy Result is complex. For simple unit tests, often mock the *Mapper* directly
            // or use an in-memory database.

            // For now, let's throw to simulate "not found" or handle specific known inputs
            std::string email_param = std::string((char*)params->at(0));
            if (email_param == "test@example.com") {
                // This would involve creating a mock drogon::orm::Result
                // Which is non-trivial. A better approach for unit testing mappers
                // is to mock the `DbClient::execSqlAsync` method in a more sophisticated way
                // or use an in-memory SQLite database.
                // For a true unit test of `UserMapper`, you'd mock `execSqlAsync` or the `DbClient` dependency.
                // For this example, we'll demonstrate a simplified path and focus on hashing/auth logic.
                throw drogon::orm::UnexpectedRows("Mocked user not found", 0); // Simulate not found for simplicity
            }
        }
        
        return drogon::orm::make_exception_future<drogon::orm::Result>(
            drogon::orm::DrogonDbException("Mocked DB operation not implemented", 0)
        );
    }

    // Override other virtual functions as needed
};

// Create a mock DbClient for UserMapper and AuthService
drogon::orm::DbClientPtr getMockDbClient() {
    // For actual testing, you'd likely use an in-memory SQLite for speed or a dedicated test DB.
    // For pure unit tests of Auth logic that doesn't hit DB, this mock is acceptable.
    return drogon::orm::DbClient::newPgClient("host=localhost port=5432 dbname=testdb user=test password=test", 1); // dummy info
}

TEST(UserMapperTest, HashAndPasswordVerification) {
    std::string password = "mySecurePassword123!";
    std::string hashedPassword = CMS::Models::UserMapper::hashPassword(password);

    ASSERT_FALSE(hashedPassword.empty());
    ASSERT_NE(password, hashedPassword);

    ASSERT_TRUE(CMS::Models::UserMapper::verifyPassword(password, hashedPassword));

    // Test with incorrect password
    ASSERT_FALSE(CMS::Models::UserMapper::verifyPassword("wrongPassword", hashedPassword));

    // Test with malformed hash
    ASSERT_FALSE(CMS::Models::UserMapper::verifyPassword(password, "malformedhash"));
}

TEST(AuthServiceTest, VerifyTokenInvalidSecret) {
    drogon::app().loadJsonConfig(Json::Value()); // Clear or load dummy config
    Json::Value config;
    config["jwt"]["secret"] = "test_secret";
    config["jwt"]["expiration_seconds"] = 3600;
    drogon::app().loadJsonConfig(config); // Set a test secret

    CMS::Services::AuthService authService(getMockDbClient());

    std::string token_with_wrong_secret = jwt::create()
        .set_issuer("cms-drogon-app")
        .set_type("JWS")
        .set_subject("1")
        .set_payload_claim("role", jwt::claim("admin"))
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds{3600})
        .sign(jwt::algorithm::hs256{"wrong_secret"}); // Signed with wrong secret

    auto result = authService.verifyToken(token_with_wrong_secret);
    ASSERT_FALSE(result.has_value());
}

TEST(AuthServiceTest, VerifyTokenExpired) {
    drogon::app().loadJsonConfig(Json::Value()); // Clear or load dummy config
    Json::Value config;
    config["jwt"]["secret"] = "test_secret_for_expiration";
    config["jwt"]["expiration_seconds"] = 1; // 1 second expiration for test
    drogon::app().loadJsonConfig(config);

    CMS::Services::AuthService authService(getMockDbClient());

    std::string expired_token = jwt::create()
        .set_issuer("cms-drogon-app")
        .set_type("JWS")
        .set_subject("2")
        .set_payload_claim("role", jwt::claim("editor"))
        .set_issued_at(std::chrono::system_clock::now() - std::chrono::seconds{10}) // Issued 10 seconds ago
        .set_expires_at(std::chrono::system_clock::now() - std::chrono::seconds{5})  // Expired 5 seconds ago
        .sign(jwt::algorithm::hs256{"test_secret_for_expiration"});

    auto result = authService.verifyToken(expired_token);
    ASSERT_FALSE(result.has_value());
}

TEST(AuthServiceTest, HasRoleLogic) {
    ASSERT_TRUE(CMS::Services::AuthService::hasRole("admin", "editor"));
    ASSERT_TRUE(CMS::Services::AuthService::hasRole("admin", "viewer"));
    ASSERT_TRUE(CMS::Services::AuthService::hasRole("admin", "admin"));
    ASSERT_TRUE(CMS::Services::AuthService::hasRole("editor", "editor"));
    ASSERT_FALSE(CMS::Services::AuthService::hasRole("editor", "admin"));
    ASSERT_FALSE(CMS::Services::AuthService::hasRole("viewer", "editor"));
    ASSERT_TRUE(CMS::Services::AuthService::hasRole("viewer", "viewer"));
}

TEST(AuthServiceTest, HasAnyRoleLogic) {
    ASSERT_TRUE(CMS::Services::AuthService::hasAnyRole("admin", {"editor", "viewer"}));
    ASSERT_TRUE(CMS::Services::AuthService::hasAnyRole("editor", {"editor", "viewer"}));
    ASSERT_FALSE(CMS::Services::AuthService::hasAnyRole("viewer", {"admin", "editor"}));
    ASSERT_TRUE(CMS::Services::AuthService::hasAnyRole("viewer", {"admin", "viewer"}));
    ASSERT_FALSE(CMS::Services::AuthService::hasAnyRole("guest", {"admin", "editor"}));
}

// Note: For UserMapper CRUD operations, setting up an in-memory SQLite for testing
// or using a robust mock framework for Drogon's DbClient would be necessary to avoid actual DB hits.
// The complexity of mocking drogon::orm::Result is high for a simple unit test.
```