```cpp
#include "JWTManager.h"
#include "util/ErrorHandler.h" // For APIException

// Mock nlohmann/json for simple payload serialization/deserialization
#include <nlohmann/json.hpp>

// Mock base64 encoding/decoding
namespace MockBase64 {
    std::string encode(const std::string& in) {
        // Simple mock: just return the input + "_encoded"
        return in + "_encoded";
    }
    std::string decode(const std::string& in) {
        // Simple mock: remove "_encoded" if present
        if (in.length() > 8 && in.substr(in.length() - 8) == "_encoded") {
            return in.substr(0, in.length() - 8);
        }
        return in;
    }
}

namespace VisuFlow {
namespace Core {
namespace Security {

JWTManager::JWTManager(const std::string& secretKey)
    : m_secretKey(secretKey) {
    VisuFlow::Util::Logger::log(spdlog::level::info, "JWTManager initialized with secret key.");
}

std::string JWTManager::createToken(long long userId, const std::string& username, const std::string& role,
                                   long long expiresInSeconds) {
    auto now = std::chrono::system_clock::now();
    auto expiresAt = now + std::chrono::seconds(expiresInSeconds);
    long long expTimestamp = std::chrono::duration_cast<std::chrono::seconds>(expiresAt.time_since_epoch()).count();

    VisuFlow::Util::Logger::log(spdlog::level::debug, "Creating token for user: {}, exp: {}", username, expTimestamp);
    return mockCreateToken(userId, username, role, expTimestamp);
}

JwtPayload JWTManager::verifyToken(const std::string& token) {
    VisuFlow::Util::Logger::log(spdlog::level::debug, "Verifying token: {}", token);
    JwtPayload payload = mockVerifyToken(token);

    auto now = std::chrono::system_clock::now();
    if (now > payload.expiresAt) {
        throw VisuFlow::Util::APIException("Token expired", 401);
    }

    VisuFlow::Util::Logger::log(spdlog::level::debug, "Token valid for user: {}", payload.username);
    return payload;
}

// --- Mock Implementations for JWT Library ---
// In a real project, this would use 'jwt-cpp' library.

std::string JWTManager::mockCreateToken(long long userId, const std::string& username, const std::string& role, long long exp) {
    nlohmann::json header;
    header["alg"] = "HS256";
    header["typ"] = "JWT";

    nlohmann::json payload;
    payload["sub"] = std::to_string(userId);
    payload["username"] = username;
    payload["role"] = role;
    payload["exp"] = exp; // Expiration time

    // Simulate base64 encoding and concatenation
    std::string encodedHeader = MockBase64::encode(header.dump());
    std::string encodedPayload = MockBase64::encode(payload.dump());

    // Simplified signature (in real JWT, this would be a cryptographic hash)
    std::string signature = "mock_signature_for_" + encodedHeader + "." + encodedPayload + "_" + m_secretKey;

    return encodedHeader + "." + encodedPayload + "." + signature;
}

JwtPayload JWTManager::mockVerifyToken(const std::string& token) {
    // A very basic mock verification: just checks if it's formatted like our mock token
    size_t firstDot = token.find('.');
    size_t secondDot = token.find('.', firstDot + 1);

    if (firstDot == std::string::npos || secondDot == std::string::npos) {
        throw VisuFlow::Util::APIException("Invalid token format", 401);
    }

    std::string encodedHeader = token.substr(0, firstDot);
    std::string encodedPayload = token.substr(firstDot + 1, secondDot - (firstDot + 1));
    std::string signature = token.substr(secondDot + 1);

    // Re-verify mock signature (simplified)
    if (signature.find("mock_signature_for_" + encodedHeader + "." + encodedPayload + "_" + m_secretKey) == std::string::npos) {
        throw VisuFlow::Util::APIException("Invalid signature", 401);
    }

    // Decode payload
    std::string decodedPayloadStr = MockBase64::decode(encodedPayload);
    nlohmann::json payloadJson = nlohmann::json::parse(decodedPayloadStr);

    JwtPayload payload;
    payload.userId = std::stoll(payloadJson.at("sub").get<std::string>());
    payload.username = payloadJson.at("username").get<std::string>();
    payload.role = payloadJson.at("role").get<std::string>();
    long long expTimestamp = payloadJson.at("exp").get<long long>();
    payload.expiresAt = std::chrono::system_clock::from_time_t(expTimestamp);

    return payload;
}

} // namespace Security
} // namespace Core
} // namespace VisuFlow
```