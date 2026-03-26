#include "jwt_manager.h"
#include "spdlog/spdlog.h"
#include <chrono>

JWTManager::JWTManager(const std::string& secret) : jwt_secret(secret) {
    if (jwt_secret.empty()) {
        spdlog::warn("JWT Secret is empty. This is insecure for production.");
    }
}

std::string JWTManager::generate_token(long long user_id, const std::string& username, const std::string& role, std::chrono::seconds expiry_seconds) {
    auto token = jwt::create()
        .set_issuer("cms-backend")
        .set_type("JWT")
        .set_id(std::to_string(user_id)) // Unique ID for the token, could be UUID
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + expiry_seconds)
        .set_payload_claim("userId", jwt::claim(std::to_string(user_id)))
        .set_payload_claim("username", jwt::claim(username))
        .set_payload_claim("role", jwt::claim(role))
        .sign(jwt::algorithm::hs256{jwt_secret});
    return token;
}

jwt::decode_result JWTManager::decode_token(const std::string& token) {
    return jwt::decode(token);
}

bool JWTManager::verify_token(const std::string& token) {
    try {
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{jwt_secret})
            .with_issuer("cms-backend");
        verifier.verify(decode_token(token));
        return true;
    } catch (const std::exception& e) {
        spdlog::debug("JWT verification failed: {}", e.what());
        return false;
    }
}