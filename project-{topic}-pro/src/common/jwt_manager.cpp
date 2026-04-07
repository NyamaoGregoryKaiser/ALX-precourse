```cpp
#include "jwt_manager.h"
#include "config.h"
#include "logger.h"
#include <stdexcept>
#include <vector>
#include <sstream>
#include <iomanip>

// For HMAC-SHA256 (requires OpenSSL development headers)
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <openssl/evp.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>

JwtManager& JwtManager::getInstance() {
    static JwtManager instance;
    return instance;
}

JwtManager::JwtManager() {
    secretKey = Config::getInstance().getString("jwt.secret");
    expiryHours = Config::getInstance().getInt("jwt.expiry_hours", 24);
    if (secretKey == "your_super_secret_jwt_key_please_change_this_in_production") {
        Logger::warn("JwtManager", "JWT secret key is default. Please change it in config.json for production!");
    }
    Logger::info("JwtManager", "JWT Manager initialized. Token expiry: {} hours.", expiryHours);
}

// --- Base64 Utilities (URL-safe for JWT) ---
std::string JwtManager::urlSafeBase64Encode(const std::string& input) {
    BIO *b64 = BIO_new(BIO_f_base64());
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL); // No newlines
    BIO *bmem = BIO_new(BIO_s_mem());
    b64 = BIO_push(b64, bmem);
    BIO_write(b64, input.c_str(), input.length());
    BIO_flush(b64);

    BUF_MEM *bptr;
    BIO_get_mem_ptr(b64, &bptr);
    std::string encoded(bptr->data, bptr->length);
    BIO_free_all(b64);

    // Make URL-safe: replace '+' with '-', '/' with '_', remove padding '='
    std::replace(encoded.begin(), encoded.end(), '+', '-');
    std::replace(encoded.begin(), encoded.end(), '/', '_');
    encoded.erase(std::remove(encoded.begin(), encoded.end(), '='), encoded.end());

    return encoded;
}

std::string JwtManager::urlSafeBase64Decode(const std::string& input) {
    std::string decoded_input = input;
    // Reverse URL-safe changes
    std::replace(decoded_input.begin(), decoded_input.end(), '-', '+');
    std::replace(decoded_input.begin(), decoded_input.end(), '_', '/');

    // Add padding back if necessary
    while (decoded_input.length() % 4 != 0) {
        decoded_input += '=';
    }

    BIO *b64 = BIO_new(BIO_f_base64());
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
    BIO *bmem = BIO_new_mem_buf(decoded_input.c_str(), decoded_input.length());
    b64 = BIO_push(b64, bmem);

    std::string output;
    char buffer[128];
    int len;
    while ((len = BIO_read(b64, buffer, sizeof(buffer))) > 0) {
        output.append(buffer, len);
    }
    BIO_free_all(b64);
    return output;
}

// --- HMAC-SHA256 ---
std::string JwtManager::hmacSha256(const std::string& key, const std::string& data) {
    unsigned char* digest;
    digest = HMAC(EVP_sha256(), key.c_str(), key.length(),
                  (const unsigned char*)data.c_str(), data.length(), NULL, NULL);

    std::stringstream ss;
    if (digest) {
        for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
            ss << std::hex << std::setw(2) << std::setfill('0') << (int)digest[i];
        }
    }
    // Return raw bytes for proper JWT signature
    return std::string(reinterpret_cast<const char*>(digest), SHA256_DIGEST_LENGTH);
}

std::string JwtManager::generateToken(const std::string& userId, const std::string& username) {
    nlohmann::json header = {
        {"alg", "HS256"},
        {"typ", "JWT"}
    };

    auto now = std::chrono::system_clock::now();
    auto expires_at = now + std::chrono::hours(expiryHours);
    auto iat_timestamp = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();
    auto exp_timestamp = std::chrono::duration_cast<std::chrono::seconds>(expires_at.time_since_epoch()).count();

    nlohmann::json payload = {
        {"user_id", userId},
        {"username", username},
        {"iat", iat_timestamp},
        {"exp", exp_timestamp}
    };

    std::string encodedHeader = urlSafeBase64Encode(header.dump());
    std::string encodedPayload = urlSafeBase64Encode(payload.dump());

    std::string signatureInput = encodedHeader + "." + encodedPayload;
    std::string signature = hmacSha256(secretKey, signatureInput);
    std::string encodedSignature = urlSafeBase64Encode(signature);

    Logger::info("JwtManager", "Generated token for user {}: {}", username, encodedHeader + "." + encodedPayload + "." + encodedSignature);
    return encodedHeader + "." + encodedPayload + "." + encodedSignature;
}

bool JwtManager::verifyToken(const std::string& token, std::string& outUserId, std::string& outUsername) {
    size_t firstDot = token.find('.');
    size_t secondDot = token.find('.', firstDot + 1);

    if (firstDot == std::string::npos || secondDot == std::string::npos) {
        Logger::warn("JwtManager", "Invalid token format (missing dots).");
        return false;
    }

    std::string encodedHeader = token.substr(0, firstDot);
    std::string encodedPayload = token.substr(firstDot + 1, secondDot - firstDot - 1);
    std::string encodedSignature = token.substr(secondDot + 1);

    // 1. Verify signature
    std::string signatureInput = encodedHeader + "." + encodedPayload;
    std::string expectedSignature = hmacSha256(secretKey, signatureInput);
    std::string decodedExpectedSignature = urlSafeBase64Encode(expectedSignature); // Re-encode for comparison

    if (decodedExpectedSignature != encodedSignature) {
        Logger::warn("JwtManager", "Token signature mismatch.");
        return false;
    }

    // 2. Decode payload and check expiry
    try {
        std::string decodedPayloadStr = urlSafeBase64Decode(encodedPayload);
        nlohmann::json payload = nlohmann::json::parse(decodedPayloadStr);

        auto now = std::chrono::system_clock::now();
        auto current_timestamp = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();

        if (!payload.contains("exp") || payload["exp"].get<long>() < current_timestamp) {
            Logger::warn("JwtManager", "Token expired or missing expiry claim.");
            return false;
        }

        if (!payload.contains("user_id") || !payload.contains("username")) {
            Logger::warn("JwtManager", "Token missing user_id or username claims.");
            return false;
        }

        outUserId = payload["user_id"].get<std::string>();
        outUsername = payload["username"].get<std::string>();
        Logger::info("JwtManager", "Token verified for user: {}", outUsername);
        return true;

    } catch (const nlohmann::json::parse_error& e) {
        Logger::warn("JwtManager", "Error parsing token payload: {}", e.what());
        return false;
    } catch (const std::exception& e) {
        Logger::warn("JwtManager", "Unexpected error during token verification: {}", e.what());
        return false;
    }
}
```