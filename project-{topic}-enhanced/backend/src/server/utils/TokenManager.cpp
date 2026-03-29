```cpp
#include "TokenManager.h"
#include "../../utils/Logger.h"
#include <chrono>

std::string TokenManager::generateToken(int user_id, const std::string& role, const std::string& secret) {
    auto now = std::chrono::system_clock::now();
    auto expires_at = now + std::chrono::hours(24); // Token valid for 24 hours

    std::string token = jwt::create()
        .set_issuer("DataVizSystem")
        .set_type("JWT")
        .set_subject(std::to_string(user_id))
        .set_issued_at(now)
        .set_expires_at(expires_at)
        .set_payload_claim("user_id", jwt::claim(std::to_string(user_id)))
        .set_payload_claim("role", jwt::claim(role))
        .sign(jwt::algorithm::hs256{secret});

    Logger::debug("Generated JWT for user_id {} (role: {}), expires at {}.", user_id, role,
                  std::chrono::system_clock::to_time_t(expires_at));
    return token;
}

jwt::decoded_jwt TokenManager::verifyToken(const std::string& token, const std::string& secret) {
    auto verifier = jwt::verify()
        .allow_algorithm(jwt::algorithm::hs256{secret})
        .with_issuer("DataVizSystem");

    verifier.verify(jwt::decode(token)); // Throws on failure
    Logger::debug("JWT token verified successfully.");
    return jwt::decode(token);
}
```