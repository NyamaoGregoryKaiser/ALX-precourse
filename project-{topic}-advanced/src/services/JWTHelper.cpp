#include "JWTHelper.h"
#include "../constants/AppConstants.h"
#include <drogon/drogon.h> // For LOG_ERROR
#include <chrono>

namespace JWTHelper {

    std::string generateToken(
        int64_t userId,
        const std::string& username,
        const std::vector<std::string>& roles,
        const std::string& secret,
        int expirationSeconds
    ) {
        if (secret.empty()) {
            LOG_ERROR << "JWT secret is empty. Cannot generate token.";
            return "";
        }

        auto token = jwt::create()
            .set_issuer(AppConstants::JWT_ISSUER)
            .set_audience(AppConstants::JWT_AUDIENCE)
            .set_type("JWT")
            .set_id(std::to_string(userId) + "-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count())) // Unique ID
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds{expirationSeconds})
            .set_payload_claim("userId", jwt::claim(std::to_string(userId)))
            .set_payload_claim("username", jwt::claim(username))
            .set_payload_claim("roles", jwt::claim(roles));

        return token.sign(jwt::algorithm::hs256{secret});
    }

    std::optional<Json::Value> verifyToken(
        const std::string& token,
        const std::string& secret
    ) {
        if (secret.empty()) {
            LOG_ERROR << "JWT secret is empty. Cannot verify token.";
            return std::nullopt;
        }

        try {
            auto verifier = jwt::verify()
                .allow_algorithm(jwt::algorithm::hs256{secret})
                .with_issuer(AppConstants::JWT_ISSUER)
                .with_audience(AppConstants::JWT_AUDIENCE);

            auto decoded_token = jwt::decode(token);
            verifier.verify(decoded_token); // Throws if verification fails

            Json::Value claims;
            for (auto const& [key, value] : decoded_token.get_payload_claims()) {
                if (value.is_string()) {
                    claims[key] = value.as_string();
                } else if (value.is_array()) {
                    Json::Value arr(Json::arrayValue);
                    for (const auto& item : value.as_array()) {
                        arr.append(item.as_string());
                    }
                    claims[key] = arr;
                } else if (value.is_integer()) {
                    claims[key] = value.as_int();
                } else if (value.is_boolean()) {
                    claims[key] = value.as_bool();
                }
                // Add more type handling if necessary
            }
            return claims;
        } catch (const jwt::error::token_verification_exception& e) {
            LOG_WARN << "JWT verification failed: " << e.what();
        } catch (const std::exception& e) {
            LOG_ERROR << "Error during JWT verification: " << e.what();
        }
        return std::nullopt;
    }

    std::optional<Json::Value> decodeToken(const std::string& token) {
        try {
            auto decoded_token = jwt::decode(token);
            Json::Value claims;
            for (auto const& [key, value] : decoded_token.get_payload_claims()) {
                if (value.is_string()) {
                    claims[key] = value.as_string();
                } else if (value.is_array()) {
                    Json::Value arr(Json::arrayValue);
                    for (const auto& item : value.as_array()) {
                        arr.append(item.as_string());
                    }
                    claims[key] = arr;
                } else if (value.is_integer()) {
                    claims[key] = value.as_int();
                } else if (value.is_boolean()) {
                    claims[key] = value.as_bool();
                }
            }
            return claims;
        } catch (const std::exception& e) {
            LOG_ERROR << "Error decoding JWT token: " << e.what();
        }
        return std::nullopt;
    }

} // namespace JWTHelper
```