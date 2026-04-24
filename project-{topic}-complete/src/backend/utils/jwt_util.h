```cpp
#ifndef ECOMMERCE_JWT_UTIL_H
#define ECOMMERCE_JWT_UTIL_H

#include <string>
#include <map>
#include <chrono>
#include <stdexcept>
#include <algorithm> // For std::replace

namespace JWTUtil {

    // Simple Base64 encoding/decoding (minimal implementation for JWT, NOT general purpose)
    std::string base64_encode(const std::string &in);
    std::string base64_decode(const std::string &in);

    // Simple HMAC-SHA256 (minimal implementation for JWT, NOT production-grade crypto)
    std::string hmac_sha256(const std::string &key, const std::string &msg);

    // --- JWT Functions ---
    std::string create_token(const std::map<std::string, std::string>& claims, const std::string& secret);
    std::map<std::string, std::string> decode_token(const std::string& token, const std::string& secret);

} // namespace JWTUtil

#endif // ECOMMERCE_JWT_UTIL_H
```