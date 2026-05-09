```cpp
#include "gtest/gtest.h"
#include "core/security/JWTManager.h"
#include "util/Logger.h"
#include "util/ErrorHandler.h" // For APIException

// Initialize logger for tests
void init_test_logger() {
    static bool initialized = false;
    if (!initialized) {
        VisuFlow::Util::Logger::init("error", "test_visuflow.log"); // Log errors only during tests
        initialized = true;
    }
}

class JWTManagerTest : public ::testing::Test {
protected:
    std::string testSecret = "my_test_secret_key";
    VisuFlow::Core::Security::JWTManager jwtManager = VisuFlow::Core::Security::JWTManager(testSecret);

    void SetUp() override {
        init_test_logger();
    }
};

TEST_F(JWTManagerTest, CreateAndVerifyToken) {
    long long userId = 123;
    std::string username = "testuser";
    std::string role = "editor";
    long long expiresInSeconds = 10; // 10 seconds for quick testing

    std::string token = jwtManager.createToken(userId, username, role, expiresInSeconds);
    ASSERT_FALSE(token.empty());

    VisuFlow::Core::Security::JwtPayload payload = jwtManager.verifyToken(token);

    ASSERT_EQ(payload.userId, userId);
    ASSERT_EQ(payload.username, username);
    ASSERT_EQ(payload.role, role);
    ASSERT_GT(payload.expiresAt.time_since_epoch().count(), 0);
}

TEST_F(JWTManagerTest, VerifyInvalidToken) {
    std::string invalidToken = "invalid.token.string";
    ASSERT_THROW(jwtManager.verifyToken(invalidToken), VisuFlow::Util::APIException);
}

TEST_F(JWTManagerTest, VerifyTokenWithWrongSecret) {
    VisuFlow::Core::Security::JWTManager wrongSecretManager("wrong_secret");
    long long userId = 123;
    std::string username = "testuser";
    std::string role = "editor";
    std::string token = jwtManager.createToken(userId, username, role); // Created with correct secret

    ASSERT_THROW(wrongSecretManager.verifyToken(token), VisuFlow::Util::APIException);
}

TEST_F(JWTManagerTest, TokenExpiration) {
    long long userId = 123;
    std::string username = "testuser";
    std::string role = "editor";
    long long expiresInSeconds = 1; // Token expires in 1 second

    std::string token = jwtManager.createToken(userId, username, role, expiresInSeconds);
    ASSERT_FALSE(token.empty());

    // Wait for the token to expire
    std::this_thread::sleep_for(std::chrono::seconds(expiresInSeconds + 1));

    ASSERT_THROW(jwtManager.verifyToken(token), VisuFlow::Util::APIException);
}
```