#include "AuthService.h"
#include "utils/Logger.h"
#include "jwt-cpp/jwt.h"
#include "argon2.h" // A real project would use a library like libsodium or a dedicated Argon2/Bcrypt library

// Simple pseudo-hashing for demonstration. Replace with real Argon2/Bcrypt.
#include <cryptopp/sha.h>
#include <cryptopp/hex.h>
#include <sstream>

std::string pseudo_hash(const std::string& password) {
    CryptoPP::SHA256 hash;
    std::string digest;
    CryptoPP::StringSource s(password, true, new CryptoPP::HashFilter(hash, new CryptoPP::HexEncoder(new CryptoPP::StringSink(digest))));
    return digest;
}

AuthService::AuthService() {}

std::optional<User> AuthService::register_user(const std::string& username, const std::string& email, const std::string& password) {
    if (user_repo_.find_by_username(username)) {
        LOG_WARN("Registration failed: Username '{}' already exists.", username);
        return std::nullopt;
    }

    User new_user;
    new_user.username = username;
    new_user.email = email;
    new_user.password_hash = hash_password(password); // Hash the password
    new_user.role = UserRole::USER;

    return user_repo_.create_user(new_user);
}

std::optional<std::string> AuthService::login_user(const std::string& username, const std::string& password, const std::string& jwt_secret) {
    auto user_opt = user_repo_.find_by_username(username);
    if (!user_opt) {
        LOG_WARN("Login failed: User '{}' not found.", username);
        return std::nullopt;
    }

    if (!verify_password(password, user_opt->password_hash)) {
        LOG_WARN("Login failed: Invalid password for user '{}'.", username);
        return std::nullopt;
    }

    LOG_INFO("User '{}' logged in successfully.", username);
    return generate_jwt(*user_opt, jwt_secret);
}

std::string AuthService::hash_password(const std::string& password) {
    // In a real application, use a robust library like libsodium (for Argon2) or bcrypt-cpp.
    // This is a placeholder for demonstration purposes.
    // Example: Using Argon2:
    // char hash[ARGON2_MAX_HASH_LEN + 1];
    // char encoded[ARGON2_MAX_ENCODED_LEN + 1];
    // int res = argon2id_hash_encoded(t_cost, m_cost, p_cost, password.c_str(), password.length(),
    //                                  salt, salt_len, hash, ARGON2_MAX_HASH_LEN, encoded, ARGON2_MAX_ENCODED_LEN);
    // if (res != ARGON2_OK) { throw std::runtime_error("Argon2 hashing failed"); }
    // return std::string(encoded);
    LOG_WARN("Using insecure pseudo_hash. Replace with a real password hashing library (e.g., Argon2, Bcrypt) in production.");
    return pseudo_hash(password);
}

bool AuthService::verify_password(const std::string& password, const std::string& hash) {
    // In a real application, use the same robust library used for hashing.
    // Example: Argon2 verification:
    // int res = argon2id_verify(hash.c_str(), password.c_str(), password.length());
    // return res == ARGON2_OK;
    LOG_WARN("Using insecure pseudo_hash verification. Replace with a real password hashing library in production.");
    return pseudo_hash(password) == hash;
}

std::string AuthService::generate_jwt(const User& user, const std::string& secret) {
    auto token = jwt::create()
        .set_issuer("webscraper-api")
        .set_type("JWT")
        .set_subject(user.username)
        .set_id(std::to_string(user.id))
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::hours{24}) // Token valid for 24 hours
        .set_payload_claim("user_id", jwt::claim(std::to_string(user.id)))
        .set_payload_claim("username", jwt::claim(user.username))
        .set_payload_claim("role", jwt::claim(user_role_to_string(user.role)))
        .sign(jwt::algorithm::hs256{secret});
    return token;
}

std::optional<AuthToken> AuthService::decode_jwt(const std::string& token_str, const std::string& jwt_secret) {
    try {
        auto decoded_token = jwt::decode(token_str);
        jwt::verify_options verify_opts;
        verify_opts.allow_algorithm(jwt::algorithm::hs256{jwt_secret});
        verify_opts.set_issuer("webscraper-api");
        // No need to verify subject or ID here, as they are claims.
        // The verifier checks signature and standard claims like expiration, issuer.
        jwt::verify(decoded_token, verify_opts);

        AuthToken auth_token;
        auth_token.user_id = std::stoi(decoded_token.get_payload_claim("user_id").as_string());
        auth_token.username = decoded_token.get_payload_claim("username").as_string();
        auth_token.role = decoded_token.get_payload_claim("role").as_string();
        auth_token.iat = decoded_token.get_issued_at();
        auth_token.exp = decoded_token.get_expires_at();

        if (auth_token.is_valid()) {
            return auth_token;
        }
    } catch (const std::exception& e) {
        LOG_WARN("JWT decoding or verification failed: {}", e.what());
    }
    return std::nullopt;
}