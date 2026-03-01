#ifndef JWT_HELPER_H
#define JWT_HELPER_H

#include <string>
#include <json/json.h>
#include <optional>
#include <vector>

// Using jwt-cpp library (https://github.com/Thalhammer/jwt-cpp)
// It's a header-only library, which simplifies integration.
// Make sure it's available via Conan or manually included.
#include <jwt-cpp/jwt.h>

namespace JWTHelper {

    /**
     * @brief Generates a JWT token for a user.
     * @param userId The ID of the user.
     * @param username The username.
     * @param roles A list of roles the user belongs to.
     * @param secret The JWT secret key.
     * @param expirationSeconds The token's expiration time in seconds.
     * @return The generated JWT token string.
     */
    std::string generateToken(
        int64_t userId,
        const std::string& username,
        const std::vector<std::string>& roles,
        const std::string& secret,
        int expirationSeconds
    );

    /**
     * @brief Verifies a JWT token.
     * @param token The JWT token string.
     * @param secret The JWT secret key.
     * @return An optional Json::Value containing the token claims if valid, empty otherwise.
     */
    std::optional<Json::Value> verifyToken(
        const std::string& token,
        const std::string& secret
    );

    /**
     * @brief Extracts claims from a JWT token without full verification (use with caution).
     * @param token The JWT token string.
     * @return An optional Json::Value containing the token claims if parsing is successful, empty otherwise.
     */
    std::optional<Json::Value> decodeToken(const std::string& token);

} // namespace JWTHelper

#endif // JWT_HELPER_H
```