#pragma once
#include <string>
#include <jwt-cpp/jwt.h> // Using jwt-cpp library

class JWTManager {
public:
    explicit JWTManager(const std::string& secret);

    std::string generate_token(long long user_id, const std::string& username, const std::string& role, std::chrono::seconds expiry_seconds = std::chrono::hours{24});
    jwt::decode_result decode_token(const std::string& token);
    bool verify_token(const std::string& token);

private:
    std::string jwt_secret;
};