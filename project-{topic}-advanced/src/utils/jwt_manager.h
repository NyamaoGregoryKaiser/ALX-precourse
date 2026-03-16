```cpp
#ifndef MOBILE_BACKEND_JWT_MANAGER_H
#define MOBILE_BACKEND_JWT_MANAGER_H

#include <string>
#include <optional>
#include <jwt-cpp/jwt.h> // Ensure this library is properly included
#include "logger.h"

namespace mobile_backend {
namespace utils {

class JwtManager {
public:
    // Initialize with a secret key
    JwtManager(const std::string& secret);

    // Create a JWT token for a given user ID
    // Returns the token string on success, empty string on failure.
    std::string create_token(int user_id, const std::string& username) const;

    // Verify a JWT token and extract the user ID
    // Returns optional user ID on success, std::nullopt on failure.
    std::optional<int> verify_token(const std::string& token) const;

private:
    std::string secret_key;
};

} // namespace utils
} // namespace mobile_backend

#endif // MOBILE_BACKEND_JWT_MANAGER_H
```