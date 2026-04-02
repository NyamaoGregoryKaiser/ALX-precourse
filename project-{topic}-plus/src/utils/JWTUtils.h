```cpp
#ifndef JWT_UTILS_H
#define JWT_UTILS_H

#include <string>
#include <json/json.hpp>
#include <optional>

namespace TaskManager {
namespace Utils {

// Simplified JWT utilities. In a real application, you'd use a dedicated library
// like jwt-cpp, or a robust crypto library (OpenSSL, Botan) for secure signing.
// This implementation provides the *logic* for JWT, but the crypto primitives
// are simplified for demonstration.

class JWTUtils {
public:
    // Generates a JWT token
    static std::string generateToken(const nlohmann::json& payload, const std::string& secret, long long expires_in_seconds);

    // Verifies a JWT token and returns the payload if valid
    static std::optional<nlohmann::json> verifyToken(const std::string& token, const std::string& secret);

private:
    // Placeholder for Base64 URL encoding. Real implementation would be more robust.
    static std::string base64url_encode(const std::string& input);
    static std::string base64url_decode(const std::string& input);

    // Placeholder for HMAC-SHA256 signing. Real implementation requires crypto library.
    static std::string hmac_sha256(const std::string& key, const std::string& msg);
};

} // namespace Utils
} // namespace TaskManager

#endif // JWT_UTILS_H
```