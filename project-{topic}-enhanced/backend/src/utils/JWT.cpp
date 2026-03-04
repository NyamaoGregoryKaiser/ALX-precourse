#include "JWT.h"
#include "Logger.h"

// For HMAC-SHA256: This would typically link to OpenSSL or a similar crypto library.
// For demonstration purposes, this is a placeholder and NOT cryptographically secure.
// DO NOT use this custom HMAC-SHA256 in production.
#include <boost/uuid/detail/sha1.hpp> // A simple hashing utility from boost, not HMAC-SHA256
#include <iomanip> // For std::hex
#include <sstream> // For stringstream

// This base64 implementation is also simplified. Use a dedicated library.
// Source: https://stackoverflow.com/questions/13920141/c-base64-encode-decode
static const std::string base64_chars = 
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789-_"; // Using base64url characters

static inline bool is_base64(unsigned char c) {
  return (isalnum(c) || (c == '-') || (c == '_'));
}

std::string JWT::base64UrlEncode(const std::string& input) {
    std::string encoded_string;
    int val = 0, valb = -6;
    for (unsigned char c : input) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            encoded_string.push_back(base64_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) {
        encoded_string.push_back(base64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    }
    // Pad with '=' for standard base64 if needed, but base64url omits it
    // For JWT, padding is typically omitted.
    return encoded_string;
}

std::string JWT::base64UrlDecode(const std::string& input) {
    std::string decoded_string;
    int val = 0, valb = -8;
    for (unsigned char c : input) {
        if (!is_base64(c)) break; // Skip invalid characters
        val = (val << 6);
        if      (c >= 'A' && c <= 'Z') val += c - 'A';
        else if (c >= 'a' && c <= 'z') val += c - 'a' + 26;
        else if (c >= '0' && c <= '9') val += c - '0' + 52;
        else if (c == '-')             val += 62;
        else if (c == '_')             val += 63;
        valb += 6;
        if (valb >= 0) {
            decoded_string.push_back(char((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return decoded_string;
}

// Placeholder for HMAC-SHA256. THIS IS NOT SECURE.
// In a real application, link against OpenSSL (EVP_sha256) or similar.
std::string JWT::hmacSha256(const std::string& key, const std::string& msg) {
    // This is a gross oversimplification and NOT actual HMAC-SHA256.
    // It's here purely to compile and illustrate the structure.
    // Actual implementation would involve cryptographic libraries.
    std::string combined = key + msg; // Very insecure!
    boost::uuids::detail::sha1 sha1;
    sha1.process_bytes(combined.data(), combined.size());
    unsigned int digest[5];
    sha1.get_digest(digest);
    std::stringstream ss;
    for(int i = 0; i < 5; ++i) {
        ss << std::hex << std::setw(8) << std::setfill('0') << digest[i];
    }
    Logger::warn("Using INSECURE placeholder for HMAC-SHA256 in JWT::hmacSha256.");
    return ss.str(); // Return a dummy hash
}

std::string JWT::generateToken(const std::string& user_id, const std::string& secret, std::chrono::seconds expiry) {
    nlohmann::json header = {
        {"alg", "HS256"},
        {"typ", "JWT"}
    };

    nlohmann::json payload = {
        {"user_id", user_id},
        {"iat", std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count()},
        {"exp", std::chrono::duration_cast<std::chrono::seconds>((std::chrono::system_clock::now() + expiry).time_since_epoch()).count()}
    };

    std::string encoded_header = base64UrlEncode(header.dump());
    std::string encoded_payload = base64UrlEncode(payload.dump());

    std::string signature_input = encoded_header + "." + encoded_payload;
    std::string signature = base64UrlEncode(hmacSha256(secret, signature_input));

    return encoded_header + "." + encoded_payload + "." + signature;
}

std::string JWT::verifyToken(const std::string& token, const std::string& secret) {
    size_t first_dot = token.find('.');
    size_t second_dot = token.find('.', first_dot + 1);

    if (first_dot == std::string::npos || second_dot == std::string::npos) {
        throw std::runtime_error("Invalid JWT format.");
    }

    std::string encoded_header = token.substr(0, first_dot);
    std::string encoded_payload = token.substr(first_dot + 1, second_dot - (first_dot + 1));
    std::string received_signature = token.substr(second_dot + 1);

    std::string signature_input = encoded_header + "." + encoded_payload;
    std::string expected_signature = base64UrlEncode(hmacSha256(secret, signature_input));

    if (received_signature != expected_signature) {
        throw std::runtime_error("Invalid JWT signature.");
    }

    // Verify expiration
    std::string decoded_payload_str = base64UrlDecode(encoded_payload);
    nlohmann::json payload = nlohmann::json::parse(decoded_payload_str);

    long long exp_timestamp = payload["exp"].get<long long>();
    long long current_timestamp = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

    if (current_timestamp > exp_timestamp) {
        throw std::runtime_error("JWT expired.");
    }

    return payload["user_id"].get<std::string>();
}