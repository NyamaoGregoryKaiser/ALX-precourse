#include <catch2/catch_test_macros.hpp>
#include <jwt-cpp/jwt.h> // For direct JWT operations in tests if needed
#include "utils/JwtManager.h"
#include "utils/AppConfig.h"
#include <chrono>
#include <fstream>
#include <filesystem>

namespace fs = std::filesystem;

// Helper to set up AppConfig for JWTManager
struct JwtConfigFixture {
    static const std::string config_path;
    JwtConfigFixture() {
        const std::string config_content = R"({
            "jwt_secret": "test_jwt_secret_123456789012345678901234567890",
            "jwt_expiration_seconds": 1
        })";
        std::ofstream file(config_path);
        file << config_content;
        file.close();
        AppConfig::getInstance().load(config_path);
    }

    ~JwtConfigFixture() {
        fs::remove(config_path);
    }
};
const std::string JwtConfigFixture::config_path = "jwt_test_app_config.json";

TEST_CASE_METHOD(JwtConfigFixture, "JwtManager generates and verifies tokens", "[JwtManager][Unit]") {
    JwtManager& jwtManager = JwtManager::getInstance();

    long long userId = 123;
    std::string username = "testuser";
    std::string role = "user";

    SECTION("Token generation is successful") {
        std::string token = jwtManager.generateToken(userId, username, role);
        REQUIRE_FALSE(token.empty());
    }

    SECTION("Token verification succeeds with valid token") {
        std::string token = jwtManager.generateToken(userId, username, role);
        auto claims = jwtManager.verifyToken(token);
        REQUIRE(claims.has_value());
        REQUIRE(claims.value()["userId"].asString() == std::to_string(userId));
        REQUIRE(claims.value()["username"].asString() == username);
        REQUIRE(claims.value()["role"].asString() == role);
    }

    SECTION("Token verification fails with invalid token format") {
        std::string invalidToken = "invalid.jwt.token";
        auto claims = jwtManager.verifyToken(invalidToken);
        REQUIRE_FALSE(claims.has_value());
    }

    SECTION("Token verification fails with wrong secret") {
        // Manually create a token with a different secret
        std::string wrongSecret = "wrong_secret";
        auto wrong_token = jwt::create()
            .set_issuer("mobile_backend")
            .set_type("JWT")
            .set_id(std::to_string(userId))
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds(1))
            .set_payload_claim("userId", jwt::claim(std::to_string(userId)))
            .set_payload_claim("username", jwt::claim(username))
            .set_payload_claim("role", jwt::claim(role))
            .sign(jwt::algorithm::hs256{wrongSecret});

        auto claims = jwtManager.verifyToken(wrong_token);
        REQUIRE_FALSE(claims.has_value());
    }

    SECTION("Token verification fails with expired token") {
        // Set expiration to 1 second in fixture, then wait
        std::string token = jwtManager.generateToken(userId, username, role);
        std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for expiration

        auto claims = jwtManager.verifyToken(token);
        REQUIRE_FALSE(claims.has_value());
    }

    SECTION("Token verification fails with invalid issuer") {
        std::string token = jwt::create()
            .set_issuer("wrong_issuer") // Intentionally wrong issuer
            .set_type("JWT")
            .set_id(std::to_string(userId))
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds(1))
            .set_payload_claim("userId", jwt::claim(std::to_string(userId)))
            .set_payload_claim("username", jwt::claim(username))
            .set_payload_claim("role", jwt::claim(role))
            .sign(jwt::algorithm::hs256{AppConfig::getInstance().getString("jwt_secret")});

        auto claims = jwtManager.verifyToken(token);
        REQUIRE_FALSE(claims.has_value());
    }
}