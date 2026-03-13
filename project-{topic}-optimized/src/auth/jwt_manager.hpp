#ifndef CMS_JWT_MANAGER_HPP
#define CMS_JWT_MANAGER_HPP

#include <string>
#include <chrono>
#include <jwt-cpp/jwt.h>
#include <optional>
#include <stdexcept>
#include "../common/config.hpp"
#include "../common/logger.hpp"

namespace cms::auth {

// Represents the data stored in the JWT payload
struct JwtPayload {
    std::string user_id;
    std::string username;
    std::string role;
};

class JwtManager {
public:
    JwtManager(const std::string& secret) : secret_(secret) {
        if (secret_.empty() || secret_.length() < 32) { // Minimum length for reasonable security
            LOG_CRITICAL("JWT_SECRET is too short or empty. This is insecure.");
            throw std::runtime_error("JWT_SECRET is insecure.");
        }
        algorithm_ = jwt::default_hs256(secret_);
    }

    std::string create_token(const std::string& user_id, const std::string& username, const std::string& role,
                             std::chrono::seconds expiry_seconds = std::chrono::hours(24)) {
        LOG_DEBUG("Creating JWT token for user_id: {}", user_id);
        auto token = jwt::create()
            .set_issuer("cms-system")
            .set_type("JWT")
            .set_id(cms::common::UUID::generate_v4())
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + expiry_seconds)
            .set_payload_claim("user_id", jwt::claim(user_id))
            .set_payload_claim("username", jwt::claim(username))
            .set_payload_claim("role", jwt::claim(role))
            .sign(algorithm_);
        LOG_DEBUG("JWT token created successfully.");
        return token;
    }

    std::optional<JwtPayload> verify_token(const std::string& token) {
        LOG_DEBUG("Verifying JWT token.");
        try {
            auto decoded_token = jwt::decode(token);
            jwt::verifier<jwt::default_clock, jwt::default_allocator> verifier(algorithm_);
            verifier.with_issuer("cms-system");

            verifier.verify(decoded_token); // Throws on invalid token or expiration

            JwtPayload payload;
            payload.user_id = decoded_token.get_payload_claim("user_id").as_string();
            payload.username = decoded_token.get_payload_claim("username").as_string();
            payload.role = decoded_token.get_payload_claim("role").as_string();
            
            LOG_DEBUG("JWT token verified successfully for user_id: {}", payload.user_id);
            return payload;
        } catch (const jwt::verification_error& e) {
            LOG_WARN("JWT verification failed: {}", e.what());
        } catch (const std::exception& e) {
            LOG_ERROR("Error verifying JWT token: {}", e.what());
        }
        return std::nullopt;
    }

private:
    std::string secret_;
    jwt::algorithm::hs256 algorithm_;
};

} // namespace cms::auth

#endif // CMS_JWT_MANAGER_HPP
```