```cpp
#include "jwt_util.h"
#include <nlohmann/json.hpp>
#include <vector>
#include <sstream>

// For simple SHA256 simulation and base64.
// This is NOT production-ready cryptography.
// A real application would use OpenSSL or Crypto++ for secure hashing and base64.

// Base64 lookup table
static const std::string base64_chars =
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789-_"; // URL-safe base64


std::string JWTUtil::base64_encode(const std::string &in) {
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
    while (out.size() % 4 != 0) { // Pad with '=' if needed (standard base64, but URL-safe often skips)
        // For URL-safe JWT, padding is often omitted.
        // For this demo, we can just not pad.
        break;
    }
    return out;
}

std::string JWTUtil::base64_decode(const std::string &in) {
    std::string out;
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T[base64_chars[i]] = i;

    int val = 0, valb = -8;
    for (unsigned char c : in) {
        if (T[c] == -1) break; // Invalid char
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(char((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

// Dummy HMAC-SHA256. In a real system, use OpenSSL's HMAC_SHA256.
std::string JWTUtil::hmac_sha256(const std::string &key, const std::string &msg) {
    // This is a minimal, non-cryptographic hash for demo
    // In a real application, use a proper cryptographic library (e.g., OpenSSL, Crypto++)
    // to implement HMAC-SHA256 securely.
    // This function simply hashes the concatenated key and message for a "signature"
    // which is NOT secure HMAC. It's for structural demonstration only.
    std::hash<std::string> hasher;
    size_t hash_val = hasher(key + msg);
    std::stringstream ss;
    ss << std::hex << std::setw(64) << std::setfill('0') << hash_val;
    std::string result = ss.str();
    if (result.length() > 64) {
        return result.substr(0, 64);
    } else if (result.length() < 64) {
        return std::string(64 - result.length(), '0') + result;
    }
    return result;
}

std::string JWTUtil::create_token(const std::map<std::string, std::string>& claims_map, const std::string& secret) {
    nlohmann::json header;
    header["alg"] = "HS256";
    header["typ"] = "JWT";

    nlohmann::json claims_json;
    for (const auto& pair : claims_map) {
        claims_json[pair.first] = pair.second;
    }

    // Add expiration claim (e.g., 1 hour from now)
    auto now = std::chrono::system_clock::now();
    auto expires_at = now + std::chrono::hours(1);
    claims_json["exp"] = std::chrono::duration_cast<std::chrono::seconds>(expires_at.time_since_epoch()).count();
    claims_json["iat"] = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();


    std::string encoded_header = base64_encode(header.dump());
    std::string encoded_claims = base64_encode(claims_json.dump());

    std::string signature_input = encoded_header + "." + encoded_claims;
    std::string signature = hmac_sha256(secret, signature_input);
    std::string encoded_signature = base64_encode(signature);

    return encoded_header + "." + encoded_claims + "." + encoded_signature;
}

std::map<std::string, std::string> JWTUtil::decode_token(const std::string& token, const std::string& secret) {
    size_t first_dot = token.find('.');
    size_t second_dot = token.find('.', first_dot + 1);

    if (first_dot == std::string::npos || second_dot == std::string::npos) {
        throw std::runtime_error("Invalid JWT format: missing dots.");
    }

    std::string encoded_header = token.substr(0, first_dot);
    std::string encoded_claims = token.substr(first_dot + 1, second_dot - (first_dot + 1));
    std::string encoded_signature = token.substr(second_dot + 1);

    // Verify signature
    std::string signature_input = encoded_header + "." + encoded_claims;
    std::string expected_signature = hmac_sha256(secret, signature_input);
    std::string expected_encoded_signature = base64_encode(expected_signature);

    if (encoded_signature != expected_encoded_signature) {
        throw std::runtime_error("Invalid JWT signature.");
    }

    // Decode claims
    std::string decoded_claims_str = base64_decode(encoded_claims);
    nlohmann::json claims_json = nlohmann::json::parse(decoded_claims_str);

    // Check expiration
    if (claims_json.contains("exp")) {
        long long exp_timestamp = claims_json["exp"].get<long long>();
        auto now = std::chrono::system_clock::now();
        long long current_timestamp = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();

        if (current_timestamp > exp_timestamp) {
            throw std::runtime_error("JWT token has expired.");
        }
    } else {
        throw std::runtime_error("JWT token missing expiration claim (exp).");
    }


    std::map<std::string, std::string> claims_map;
    for (nlohmann::json::iterator it = claims_json.begin(); it != claims_json.end(); ++it) {
        if (it->is_primitive()) { // Only handle primitive types
            claims_map[it.key()] = it->dump(); // Dumps as string, e.g., "123" for number
            // Remove quotes for strings if needed, or handle types properly
            if (it->is_string()) {
                claims_map[it.key()] = it->get<std::string>();
            } else if (it->is_number_integer() || it->is_number_float()) {
                 claims_map[it.key()] = std::to_string(it->get<long long>()); // Convert numbers to string
            }
        }
    }
    return claims_map;
}

```