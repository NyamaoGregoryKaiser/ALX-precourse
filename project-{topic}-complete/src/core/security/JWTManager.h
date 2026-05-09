```cpp
#ifndef VISUFLOW_JWT_MANAGER_H
#define VISUFLOW_JWT_MANAGER_H

#include "util/Logger.h"
#include <string>
#include <chrono>
#include <map>

// Mock jwt-cpp structures for demonstration
namespace jwt {
    struct builder {};
    struct verifier {};
    struct decoded_jwt {};

    namespace algorithm {
        struct hs256 { hs256(std::string key) {} };
    }
}

namespace VisuFlow {
namespace Core {
namespace Security {

struct JwtPayload {
    long long userId;
    std::string username;
    std::string role;
    std::chrono::system_clock::time_point expiresAt;
};

/**
 * @brief Manages JWT token creation and verification.
 */
class JWTManager {
public:
    explicit JWTManager(const std::string& secretKey);

    /**
     * @brief Creates a new JWT token.
     * @param userId The ID of the user.
     * @param username The username.
     * @param role The user's role.
     * @param expiresInSeconds Token expiration time in seconds (default: 1 hour).
     * @return The generated JWT string.
     */
    std::string createToken(long long userId, const std::string& username, const std::string& role,
                            long long expiresInSeconds = 3600);

    /**
     * @brief Verifies a JWT token and returns its payload.
     * @param token The JWT string to verify.
     * @return The JwtPayload if verification is successful.
     * @throws std::runtime_error if token is invalid or expired.
     */
    JwtPayload verifyToken(const std::string& token);

private:
    std::string m_secretKey;

    // Conceptual functions for JWT library
    std::string mockCreateToken(long long userId, const std::string& username, const std::string& role, long long exp);
    JwtPayload mockVerifyToken(const std::string& token);
};

} // namespace Security
} // namespace Core
} // namespace VisuFlow

#endif // VISUFLOW_JWT_MANAGER_H
```