```cpp
#ifndef WEBSCRAPER_JWT_MANAGER_H
#define WEBSCRAPER_JWT_MANAGER_H

#include <string>
#include <chrono>
#include <map>
#include <nlohmann/json.hpp>

// A simplified JWT Manager (without full jwt-cpp library integration for build simplicity)
// This will simulate the signing/verification logic using a shared secret.
class JwtManager {
public:
    static JwtManager& getInstance();
    JwtManager(const JwtManager&) = delete;
    JwtManager& operator=(const JwtManager&) = delete;

    std::string generateToken(const std::string& userId, const std::string& username);
    bool verifyToken(const std::string& token, std::string& outUserId, std::string& outUsername);

private:
    JwtManager();
    std::string secretKey;
    long expiryHours; // Token expiry time in hours

    std::string base64Encode(const std::string& input);
    std::string base64Decode(const std::string& input);
    std::string hmacSha256(const std::string& key, const std::string& data);

    std::string urlSafeBase64Encode(const std::string& input);
    std::string urlSafeBase64Decode(const std::string& input);
};

#endif // WEBSCRAPER_JWT_MANAGER_H
```