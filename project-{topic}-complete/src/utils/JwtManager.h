```cpp
#ifndef JWT_MANAGER_H
#define JWT_MANAGER_H

#include <string>
#include <chrono>
#include <ctime>
#include <map>
// For real JWT, you'd use a library like jwt-cpp: https://github.com/Thalhammer/jwt-cpp
// #include <jwt-cpp/jwt.h>

namespace PaymentProcessor {
namespace Utils {

// A simplified conceptual JWT Manager for demonstration.
// In a real application, integrate with a library like jwt-cpp.
class JwtManager {
public:
    static std::string SECRET_KEY; // Loaded from config

    // Generates a simple JWT-like token.
    // In a real system, this would sign the token cryptographically.
    static std::string generateToken(const std::string& userId, const std::string& role, std::chrono::seconds expiryDuration = std::chrono::hours(24)) {
        if (SECRET_KEY.empty()) {
            throw std::runtime_error("JWT_SECRET_KEY not set.");
        }

        auto now = std::chrono::system_clock::now();
        auto expires_at = now + expiryDuration;
        auto expires_ts = std::chrono::duration_cast<std::chrono::seconds>(expires_at.time_since_epoch()).count();

        // Simplified token structure (base64(header) + base64(payload) + base64(signature))
        // Actual JWT requires proper base64URL encoding and cryptographic signing.
        std::string header = R"({"alg":"HS256","typ":"JWT"})"; // Algorithm, type
        std::string payload = R"({"user_id":")" + userId + R"(", "role":")" + role + R"(", "exp":)" + std::to_string(expires_ts) + R"(})";

        // For a true JWT, the signature would be `base64urlEncode(HMACSHA256(base64urlEncode(header) + "." + base64urlEncode(payload), SECRET_KEY))`
        // Here, we just hash the payload for a 'simulated' signature
        std::hash<std::string> hasher;
        std::string signature = std::to_string(hasher(header + "." + payload + SECRET_KEY));

        return "SIM_HEADER." + "SIM_PAYLOAD." + signature; // Placeholder
    }

    // Verifies and decodes a simple JWT-like token.
    // In a real system, this would verify the cryptographic signature and parse claims.
    static bool verifyToken(const std::string& token) {
        if (SECRET_KEY.empty()) {
            return false; // Cannot verify without key
        }
        if (token.empty() || token.find("SIM_HEADER.SIM_PAYLOAD.") == std::string::npos) {
            return false;
        }

        // Split the token parts (header, payload, signature)
        size_t firstDot = token.find('.');
        size_t secondDot = token.find('.', firstDot + 1);
        if (firstDot == std::string::npos || secondDot == std::string::npos) {
            return false; // Invalid token format
        }

        // Simplified signature verification (matches how it was generated)
        std::string expected_header = R"({"alg":"HS256","typ":"JWT"})";
        std::string expected_payload_prefix = R"({"user_id":")"; // Just check prefix for simplicity

        // Reconstruct "signed" part to verify signature
        std::string parts = token.substr(0, secondDot);
        std::string expected_signature = std::to_string(std::hash<std::string>{}(expected_header + "." + parts + SECRET_KEY));

        std::string received_signature_part = token.substr(secondDot + 1);

        if (received_signature_part != expected_signature) {
            return false; // Signature mismatch
        }

        // Basic expiry check (this would involve parsing 'exp' from the payload)
        // For this demo, we'll just assume it's valid if signature matches.
        // A real JWT library would handle this automatically.

        return true;
    }

    // Extracts a claim from the token.
    // In a real JWT system, you'd parse the base64-decoded payload JSON.
    static std::string getClaim(const std::string& token, const std::string& claimName) {
        if (!verifyToken(token)) {
            return ""; // Invalid token, no claims
        }

        // This is highly simplified and assumes a fixed payload structure for demo.
        // A real JWT library would provide a parsed JSON object for claims.
        if (claimName == "user_id") {
            // Placeholder: In a real JWT, you'd parse the JSON payload
            // For example, if payload was {"user_id":"123", ...}
            return "1"; // Simulating user_id '1'
        } else if (claimName == "role") {
            return "admin"; // Simulating role 'admin'
        }
        return "";
    }
};

std::string JwtManager::SECRET_KEY = ""; // Will be loaded from AppConfig

} // namespace Utils
} // namespace PaymentProcessor

#endif // JWT_MANAGER_H
```