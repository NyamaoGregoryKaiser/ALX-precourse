```cpp
#include "JwtManager.h"
#include "utils/Logger.h"
#include <chrono>

namespace JwtManager {
    std::string s_jwt_secret;
    int s_jwt_expiration_seconds;
    jwt::verifier<jwt::default_clock, jwt::default_claim_provider> s_verifier = jwt::verify(); // Initialize with default

    void init(const std::string& secret, int expiration_seconds) {
        s_jwt_secret = secret;
        s_jwt_expiration_seconds = expiration_seconds;
        s_verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{s_jwt_secret})
            .with_issuer("TaskAPI")
            .with_audience("users")
            .leeway(60); // Allow for 60 seconds of clock skew
        LOG_INFO("JWT Manager initialized with secret (first 5 chars): {}..., expiration: {}s.",
                 s_jwt_secret.substr(0, 5), s_jwt_expiration_seconds);
    }

    std::string generateToken(long user_id, const std::string& username) {
        if (s_jwt_secret.empty()) {
            LOG_ERROR("JWT secret not initialized.");
            throw JwtException("JWT secret is not configured.");
        }

        auto token = jwt::create()
            .set_issuer("TaskAPI")
            .set_audience("users")
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds{s_jwt_expiration_seconds})
            .set_payload_claim("user_id", jwt::claim(static_cast<int>(user_id))) // jwt-cpp uses int for int claims
            .set_payload_claim("username", jwt::claim(username))
            .sign(jwt::algorithm::hs256{s_jwt_secret});
        LOG_DEBUG("Generated JWT for user_id: {}, username: {}", user_id, username);
        return token;
    }

    jwt::decode verifyToken(const std::string& token) {
        if (s_jwt_secret.empty()) {
            LOG_ERROR("JWT secret not initialized.");
            throw JwtException("JWT secret is not configured.");
        }
        try {
            auto decoded_token = jwt::decode(token);
            s_verifier.verify(decoded_token); // Throws if invalid
            LOG_DEBUG("JWT verified successfully.");
            return decoded_token;
        } catch (const jwt::error::signature_verification_exception& e) {
            LOG_WARN("JWT signature verification failed: {}", e.what());
            throw JwtException("Invalid token signature.");
        } catch (const jwt::error::token_verification_exception& e) {
            LOG_WARN("JWT verification failed (e.g., expired): {}", e.what());
            throw JwtException("Invalid or expired token.");
        } catch (const std::exception& e) {
            LOG_ERROR("Unexpected error during JWT verification: {}", e.what());
            throw JwtException(std::string("Token verification failed: ") + e.what());
        }
    }

    std::optional<long> getUserIdFromToken(const std::string& token) {
        try {
            auto decoded_token = jwt::decode(token);
            auto payload_claim = decoded_token.get_payload_claim("user_id");
            if (payload_claim.get_type() == jwt::json::type::INTEGER) {
                return static_cast<long>(payload_claim.as_int());
            }
        } catch (const std::exception& e) {
            LOG_DEBUG("Could not extract user_id from token: {}", e.what());
        }
        return std::nullopt;
    }

    std::optional<std::string> getUsernameFromToken(const std::string& token) {
        try {
            auto decoded_token = jwt::decode(token);
            auto payload_claim = decoded_token.get_payload_claim("username");
            if (payload_claim.get_type() == jwt::json::type::STRING) {
                return payload_claim.as_string();
            }
        } catch (const std::exception& e) {
            LOG_DEBUG("Could not extract username from token: {}", e.what());
        }
        return std::nullopt;
    }
}
```