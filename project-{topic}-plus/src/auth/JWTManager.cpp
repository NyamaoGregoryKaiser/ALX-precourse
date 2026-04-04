#include "JWTManager.h"
#include "utils/Logger.h"
#include <ctime>

namespace tm_api {
namespace auth {

JWTManager::JWTManager(const std::string& secret, int expiryMinutes)
    : secret(secret), expiryMinutes(expiryMinutes),
      verifier(jwt::verify().allow_algorithm(jwt::algorithm::hs256{}).with_issuer("task-manager-system")) {
    if (secret.length() < 32) { // Recommended minimum for HS256
        LOG_CRITICAL("JWT secret is too short. It should be at least 32 characters for HS256.");
        // In production, consider throwing an exception or refusing to start.
    }
    LOG_INFO("JWTManager initialized with secret length {} and expiry {} minutes.", secret.length(), expiryMinutes);
}

std::string JWTManager::generateToken(const JWTPayload& payload) const {
    try {
        auto token = jwt::create()
            .set_issuer("task-manager-system")
            .set_type("JWT")
            .set_id(payload.userId) // Use user ID as jti (JWT ID)
            .set_subject(payload.username) // User's username as subject
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::minutes{expiryMinutes})
            .set_payload_claim("user_id", jwt::claim(payload.userId))
            .set_payload_claim("username", jwt::claim(payload.username))
            .set_payload_claim("role", jwt::claim(payload.role))
            .sign(jwt::algorithm::hs256{secret});
        LOG_DEBUG("Generated JWT for user: {} with role: {}", payload.username, payload.role);
        return token;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to generate JWT: {}", e.what());
        return ""; // Return empty string on failure
    }
}

std::optional<JWTPayload> JWTManager::verifyToken(const std::string& token) const {
    try {
        // Build verifier dynamically to include 'secret'
        auto decoded = jwt::decode(token);
        // verifier.verify(decoded); // This will use the previously configured secret.
        // For more dynamic secret management, you might need a different approach
        // or pass a verifier with the current secret.
        // The jwt-cpp library generally assumes the verifier's secret is static.
        // A direct approach for verifying with a runtime secret:
        jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{secret})
            .with_issuer("task-manager-system")
            .verify(decoded);

        // Extract payload
        JWTPayload payload;
        payload.userId = decoded.get_payload_claim("user_id").as_string();
        payload.username = decoded.get_payload_claim("username").as_string();
        payload.role = decoded.get_payload_claim("role").as_string();

        LOG_DEBUG("Verified JWT for user: {} with role: {}", payload.username, payload.role);
        return payload;
    } catch (const jwt::verification_error& e) {
        LOG_WARN("JWT verification failed: {}", e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Error verifying JWT: {}", e.what());
    }
    return std::nullopt; // Return empty optional on failure
}

} // namespace auth
} // namespace tm_api