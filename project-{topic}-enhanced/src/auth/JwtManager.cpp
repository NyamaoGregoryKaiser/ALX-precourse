```cpp
#include "JwtManager.hpp"
#include "../utils/CryptoUtils.hpp"
#include "../logger/Logger.hpp"

#include <chrono>
#include <nlohmann/json.hpp>
#include <string>
#include <stdexcept>
#include <algorithm> // For std::replace

JwtManager::JwtManager(const std::string& secret, int expirationSeconds)
    : secret(secret), expirationSeconds(expirationSeconds) {
    if (secret.empty() || secret.length() < 32) {
        Logger::error("JwtManager: JWT secret key is empty or too short. This is insecure.");
        throw std::runtime_error("JWT secret key must be at least 32 characters long.");
    }
}

// Helper function to base64url encode
std::string JwtManager::base64urlEncode(const std::string& data) {
    std::string encoded = CryptoUtils::base64Encode(data);
    std::replace(encoded.begin(), encoded.end(), '+', '-');
    std::replace(encoded.begin(), encoded.end(), '/', '_');
    encoded.erase(std::remove(encoded.begin(), encoded.end(), '='), encoded.end());
    return encoded;
}

// Helper function to base64url decode
std::string JwtManager::base64urlDecode(const std::string& data) {
    std::string decoded = data;
    std::replace(decoded.begin(), decoded.end(), '-', '+');
    std::replace(decoded.begin(), decoded.end(), '_', '/');
    switch (decoded.length() % 4) {
        case 2: decoded += "=="; break;
        case 3: decoded += "="; break;
    }
    return CryptoUtils::base64Decode(decoded);
}

// Creates a JWT token for the given user ID and role.
std::string JwtManager::createToken(int userId, const std::string& role) {
    nlohmann::json header;
    header["alg"] = "HS256";
    header["typ"] = "JWT";

    nlohmann::json payload;
    payload["user_id"] = userId;
    payload["role"] = role;
    payload["iat"] = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    payload["exp"] = payload["iat"].get<long long>() + expirationSeconds;

    std::string encodedHeader = base64urlEncode(header.dump());
    std::string encodedPayload = base64urlEncode(payload.dump());

    std::string signatureInput = encodedHeader + "." + encodedPayload;
    std::string signature = CryptoUtils::hmacSha256(signatureInput, secret);
    std::string encodedSignature = base64urlEncode(signature);

    std::string token = encodedHeader + "." + encodedPayload + "." + encodedSignature;
    Logger::debug("JwtManager: Created token for user_id: {}", userId);
    return token;
}

// Verifies a JWT token. Returns true if valid, false otherwise.
// If valid, extracts user_id and role into the provided references.
bool JwtManager::verifyToken(const std::string& token, int& userId, std::string& role) {
    try {
        size_t firstDot = token.find('.');
        size_t secondDot = token.find('.', firstDot + 1);

        if (firstDot == std::string::npos || secondDot == std::string::npos) {
            Logger::warn("JwtManager: Invalid token format (missing dots).");
            return false;
        }

        std::string encodedHeader = token.substr(0, firstDot);
        std::string encodedPayload = token.substr(firstDot + 1, secondDot - (firstDot + 1));
        std::string encodedSignature = token.substr(secondDot + 1);

        std::string signatureInput = encodedHeader + "." + encodedPayload;
        std::string expectedSignature = CryptoUtils::hmacSha256(signatureInput, secret);
        std::string expectedEncodedSignature = base64urlEncode(expectedSignature);

        if (expectedEncodedSignature != encodedSignature) {
            Logger::warn("JwtManager: Token signature mismatch.");
            return false; // Signature mismatch
        }

        std::string decodedPayload = base64urlDecode(encodedPayload);
        nlohmann::json payload = nlohmann::json::parse(decodedPayload);

        // Check expiration
        long long currentTimestamp = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        if (!payload.contains("exp") || payload["exp"].get<long long>() < currentTimestamp) {
            Logger::warn("JwtManager: Token expired.");
            return false; // Token expired
        }

        userId = payload["user_id"].get<int>();
        role = payload["role"].get<std::string>();
        Logger::debug("JwtManager: Token verified for user_id: {}, role: {}", userId, role);
        return true;

    } catch (const nlohmann::json::parse_error& e) {
        Logger::warn("JwtManager: Failed to parse JWT payload: {}", e.what());
    } catch (const std::exception& e) {
        Logger::warn("JwtManager: Error verifying token: {}", e.what());
    }
    return false;
}

// Verifies a JWT token without extracting user info (useful for simple validity check)
bool JwtManager::verifyToken(const std::string& token) {
    int userId;
    std::string role;
    return verifyToken(token, userId, role);
}

// Extracts user ID and role from a valid token (without re-verifying signature, assume it's already verified)
// Use after `verifyToken(token, userId, role)`
std::pair<int, std::string> JwtManager::extractClaims(const std::string& token) {
    size_t firstDot = token.find('.');
    size_t secondDot = token.find('.', firstDot + 1);

    if (firstDot == std::string::npos || secondDot == std::string::npos) {
        throw std::runtime_error("Invalid token format for claims extraction.");
    }

    std::string encodedPayload = token.substr(firstDot + 1, secondDot - (firstDot + 1));
    std::string decodedPayload = base64urlDecode(encodedPayload);
    nlohmann::json payload = nlohmann::json::parse(decodedPayload);

    int userId = payload["user_id"].get<int>();
    std::string role = payload["role"].get<std::string>();

    return {userId, role};
}
```