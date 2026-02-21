```cpp
#ifndef CRYPTO_H
#define CRYPTO_H

#include <string>
#include <vector>
#include <stdexcept>
#include <algorithm>
#include <random>
#include <chrono>

#include <jwt-cpp/jwt.h> // For JWT
#include <bcrypt.h> // For password hashing
#include "Logger.h"

class Crypto {
public:
    // --- Password Hashing (using bcrypt) ---
    static std::string hash_password(const std::string& password) {
        try {
            char salt[BCRYPT_HASHSIZE];
            char hash[BCRYPT_HASHSIZE];
            bcrypt_gensalt(12, salt); // 12 is the cost factor
            bcrypt_hashpw(password.c_str(), salt, hash);
            return std::string(hash);
        } catch (const std::exception& e) {
            LOG_ERROR("Error hashing password: {}", e.what());
            throw std::runtime_error("Password hashing failed");
        }
    }

    static bool verify_password(const std::string& password, const std::string& hashed_password) {
        try {
            return bcrypt_checkpw(password.c_str(), hashed_password.c_str()) == 0;
        } catch (const std::exception& e) {
            LOG_ERROR("Error verifying password: {}", e.what());
            return false;
        }
    }

    // --- JWT (JSON Web Tokens) ---
    static void set_jwt_secret(const std::string& secret) {
        jwt_secret_key = secret;
    }

    static std::string create_jwt(const std::string& user_id, const std::string& username, int expiry_seconds) {
        if (jwt_secret_key.empty()) {
            throw std::runtime_error("JWT secret key not set.");
        }
        try {
            auto token = jwt::create()
                .set_issuer("performance-monitoring-system")
                .set_type("JWT")
                .set_subject(user_id)
                .set_payload_claim("username", jwt::claim(username))
                .set_issued_at(std::chrono::system_clock::now())
                .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds{expiry_seconds})
                .sign(jwt::algorithm::hs256{jwt_secret_key});
            return token;
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to create JWT for user {}: {}", user_id, e.what());
            throw std::runtime_error("Failed to create JWT");
        }
    }

    static jwt::decoded_jwt verify_jwt(const std::string& token) {
        if (jwt_secret_key.empty()) {
            throw std::runtime_error("JWT secret key not set.");
        }
        try {
            auto verifier = jwt::verify()
                .allow_algorithm(jwt::algorithm::hs256{jwt_secret_key})
                .with_issuer("performance-monitoring-system");
            return verifier.verify(token);
        } catch (const std::exception& e) {
            LOG_WARN("JWT verification failed: {}", e.what());
            throw std::runtime_error("Invalid or expired token");
        }
    }

    // --- Unique ID Generation (for UUIDs) ---
    static std::string generate_uuid() {
        static std::random_device rd;
        static std::mt19937 gen(rd());
        static std::uniform_int_distribution<> dis(0, 15);
        static std::uniform_int_distribution<> dis2(8, 11);

        std::stringstream ss;
        int i;
        ss << std::hex;
        for (i = 0; i < 8; i++) {
            ss << dis(gen);
        }
        ss << "-";
        for (i = 0; i < 4; i++) {
            ss << dis(gen);
        }
        ss << "-4"; // UUID v4
        for (i = 0; i < 3; i++) {
            ss << dis(gen);
        }
        ss << "-";
        ss << dis2(gen);
        for (i = 0; i < 3; i++) {
            ss << dis(gen);
        }
        ss << "-";
        for (i = 0; i < 12; i++) {
            ss << dis(gen);
        }
        return ss.str();
    }


private:
    static std::string jwt_secret_key;

    Crypto() = delete; // Prevent instantiation
};

// Static member initialization
std::string Crypto::jwt_secret_key;

#endif // CRYPTO_H

```