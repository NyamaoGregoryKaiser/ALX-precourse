```cpp
#include "JWTUtils.h"
#include "Logger.h"
#include "TimeUtil.h"
#include <stdexcept>
#include <vector>
#include <iostream>

// For simplified base64 and HMAC-SHA256 in this example.
// In production, use robust libraries (e.g., OpenSSL for crypto, or a JWT library like jwt-cpp).
// Base64URL encoding/decoding:
// This is a minimal implementation for demonstration. It does not handle padding '=' properly for URL-safe.
// A full implementation would be much longer.
static const std::string base64_chars =
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789-_"; // URL-safe characters

std::string base64url_encode_simple(const std::string& in) {
    std::string out;
    int val = 0, valb = -6;
    for (unsigned char c : in) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back(base64_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) {
        out.push_back(base64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    }
    return out;
}

std::string base64url_decode_simple(const std::string& in) {
    std::string out;
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T[base64_chars[i]] = i;

    int val = 0, valb = -8;
    for (unsigned char c : in) {
        if (T[c] == -1) break; // Invalid character
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(char((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

// Placeholder for HMAC-SHA256. This is *NOT* a real HMAC-SHA256 implementation.
// It's a simple mock to allow the JWT logic to compile and run.
// A real HMAC-SHA256 would use a cryptographic library like OpenSSL.
std::string hmac_sha256_mock(const std::string& key, const std::string& msg) {
    // In a real application, link against OpenSSL (or similar) and use:
    // HMAC(EVP_sha256(), key.c_str(), key.length(),
    //      (const unsigned char*)msg.c_str(), msg.length(),
    //      hmac_result, &hmac_len);
    // For this example, we'll just return a simple "hash" for demonstration.
    // This is NOT cryptographically secure.
    return base64url_encode_simple(key + msg + "_signed");
}


namespace TaskManager {
namespace Utils {

std::string JWTUtils::base64url_encode(const std::string& input) {
    return base64url_encode_simple(input);
}

std::string JWTUtils::base64url_decode(const std::string& input) {
    return base64url_decode_simple(input);
}

std::string JWTUtils::hmac_sha256(const std::string& key, const std::string& msg) {
    return hmac_sha256_mock(key, msg);
}


std::string JWTUtils::generateToken(const nlohmann::json& payload, const std::string& secret, long long expires_in_seconds) {
    nlohmann::json header = {
        {"alg", "HS256"},
        {"typ", "JWT"}
    };

    nlohmann::json current_payload = payload;
    long long current_time = TimeUtil::getCurrentUnixTimestamp();
    current_payload["iat"] = current_time;
    current_payload["exp"] = current_time + expires_in_seconds;

    std::string encoded_header = base64url_encode(header.dump());
    std::string encoded_payload = base64url_encode(current_payload.dump());

    std::string signature_input = encoded_header + "." + encoded_payload;
    std::string signature = hmac_sha256(secret, signature_input);

    return encoded_header + "." + encoded_payload + "." + signature;
}

std::optional<nlohmann::json> JWTUtils::verifyToken(const std::string& token, const std::string& secret) {
    auto logger = Logger::getLogger();
    logger->debug("Verifying token: {}", token);

    std::vector<std::string> parts;
    std::string current_part;
    std::stringstream ss(token);
    while (std::getline(ss, current_part, '.')) {
        parts.push_back(current_part);
    }

    if (parts.size() != 3) {
        logger->warn("JWT token has invalid number of parts: {}", parts.size());
        return std::nullopt;
    }

    std::string encoded_header = parts[0];
    std::string encoded_payload = parts[1];
    std::string provided_signature = parts[2];

    std::string header_json_str = base64url_decode(encoded_header);
    std::string payload_json_str = base64url_decode(encoded_payload);

    nlohmann::json header;
    nlohmann::json payload;

    try {
        header = nlohmann::json::parse(header_json_str);
        payload = nlohmann::json::parse(payload_json_str);
    } catch (const nlohmann::json::parse_error& e) {
        logger->warn("Failed to parse JWT header or payload: {}", e.what());
        return std::nullopt;
    }

    // Verify signature
    std::string signature_input = encoded_header + "." + encoded_payload;
    std::string expected_signature = hmac_sha256(secret, signature_input);

    if (provided_signature != expected_signature) {
        logger->warn("JWT signature mismatch. Provided: '{}', Expected: '{}'", provided_signature, expected_signature);
        return std::nullopt;
    }

    // Verify expiration
    if (payload.count("exp") && payload["exp"].is_number()) {
        long long expiration_time = payload["exp"].get<long long>();
        long long current_time = TimeUtil::getCurrentUnixTimestamp();
        if (current_time > expiration_time) {
            logger->warn("JWT token has expired. Current time: {}, Expiration: {}", current_time, expiration_time);
            return std::nullopt;
        }
    } else {
        logger->warn("JWT payload missing or invalid 'exp' claim.");
        return std::nullopt; // Expiration claim is mandatory for this system
    }

    logger->debug("JWT token verified successfully. Payload: {}", payload.dump());
    return payload;
}

} // namespace Utils
} // namespace TaskManager
```