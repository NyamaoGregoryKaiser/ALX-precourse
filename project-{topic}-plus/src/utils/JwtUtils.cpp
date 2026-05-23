#include "JwtUtils.h"
#include "../logger/Logger.h"
#include <string>
#include <vector>
#include <algorithm>
#include <stdexcept>
#include <openssl/sha.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <base64.h> // Assuming you have a base64 implementation, e.g., from cppcodec or similar
#include <random>

// Using a simple base64 implementation. In a real project, use a robust library like cppcodec.
// For demonstration purposes, we'll assume `base64_encode` and `base64_decode` functions exist.
// You would need to add an actual base64 library or implement these.
// Example of a minimal base64 encode/decode (not optimized or fully robust for production):
std::string base64_encode(const std::string& in) {
    std::string out;
    int val = 0, valb = -6;
    for (unsigned char c : in) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) {
        out.push_back("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[((val << 8) >> (valb + 8)) & 0x3F]);
    }
    return out;
}

std::string base64_decode(const std::string& in) {
    std::string out;
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[i]] = i;

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

namespace JwtUtils {

std::string hmac_sha256(const std::string& key, const std::string& msg) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int len;
    HMAC(EVP_sha256(), key.c_str(), key.length(),
         (const unsigned char*)msg.c_str(), msg.length(), hash, &len);
    
    std::string result(reinterpret_cast<char*>(hash), len);
    return result;
}

std::string encode(const Claims& claims, const std::string& secret) {
    nlohmann::json header = {
        {"alg", "HS256"},
        {"typ", "JWT"}
    };

    nlohmann::json payload = {
        {"user_id", claims.user_id},
        {"role", claims.role},
        {"exp", claims.exp}
    };

    std::string encoded_header = base64_encode(header.dump());
    std::string encoded_payload = base64_encode(payload.dump());

    std::string signature_input = encoded_header + "." + encoded_payload;
    std::string signature = base64_encode(hmac_sha256(secret, signature_input));

    return encoded_header + "." + encoded_payload + "." + signature;
}

std::optional<Claims> decode(const std::string& token, const std::string& secret) {
    size_t first_dot = token.find('.');
    size_t second_dot = token.find('.', first_dot + 1);

    if (first_dot == std::string::npos || second_dot == std::string::npos) {
        Logger::get_logger()->warn("Invalid JWT format: missing dots.");
        return std::nullopt;
    }

    std::string encoded_header = token.substr(0, first_dot);
    std::string encoded_payload = token.substr(first_dot + 1, second_dot - first_dot - 1);
    std::string signature = token.substr(second_dot + 1);

    // Verify signature
    std::string expected_signature = base64_encode(hmac_sha256(secret, encoded_header + "." + encoded_payload));
    if (signature != expected_signature) {
        Logger::get_logger()->warn("JWT signature mismatch.");
        return std::nullopt;
    }

    // Decode payload
    try {
        std::string decoded_payload_str = base64_decode(encoded_payload);
        nlohmann::json payload = nlohmann::json::parse(decoded_payload_str);

        Claims claims;
        claims.user_id = payload["user_id"].get<std::string>();
        claims.role = payload["role"].get<std::string>();
        claims.exp = payload["exp"].get<long>();

        // Check expiration
        auto now = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        if (now > claims.exp) {
            Logger::get_logger()->warn("JWT token expired.");
            return std::nullopt;
        }

        return claims;
    } catch (const nlohmann::json::parse_error& e) {
        Logger::get_logger()->error("JWT payload parse error: {}", e.what());
        return std::nullopt;
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Error decoding JWT: {}", e.what());
        return std::nullopt;
    }
}

std::string generateRandomSecret(size_t length) {
    static const char charset[] =
        "0123456789"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?`~";
    std::string result;
    result.reserve(length);

    std::random_device rd;
    std::mt19937 generator(rd());
    std::uniform_int_distribution<> distribution(0, sizeof(charset) - 2); // -2 for null terminator and last char

    for (size_t i = 0; i < length; ++i) {
        result += charset[distribution(generator)];
    }
    return result;
}

} // namespace JwtUtils