```cpp
#include "util/CryptoUtils.hpp"
#include "util/Config.hpp"
#include "util/Logger.hpp"
#include "models/User.hpp" // For UserRole enum
#include <chrono>
#include <random>
#include <sstream>
#include <iomanip> // For std::hex, std::setw
#include <jwt-cpp/jwt.h> // Requires jwt-cpp library, for illustrative purposes

// Placeholder for actual cryptographic operations
// In a real system, you'd use libraries like OpenSSL, libsodium, or specialized password hashing libs (argon2)

std::string CryptoUtils::jwtSecret;

std::string CryptoUtils::hashPassword(const std::string& password) {
    // In a real application, use a strong password hashing algorithm like Argon2 or bcrypt.
    // This is a simple SHA256 placeholder for demonstration. NOT SECURE FOR PRODUCTION.
    Logger::get()->warn("Using a weak password hashing placeholder. Replace with Argon2/bcrypt in production.");
    return "hashed_" + password; // Placeholder
}

bool CryptoUtils::verifyPassword(const std::string& password, const std::string& hashedPassword) {
    // In a real application, use the appropriate verification function for your hashing algorithm.
    return ("hashed_" + password) == hashedPassword; // Placeholder
}

std::string CryptoUtils::generateJwtToken(long userId, const std::string& username, UserRole role, long expiryMinutes) {
    if (jwtSecret.empty()) {
        jwtSecret = Config::getJwtSecret();
    }

    auto now = std::chrono::system_clock::now();
    auto expires_at = now + std::chrono::minutes(expiryMinutes);

    std::string roleStr = nlohmann::json(role).dump(); // Convert UserRole enum to string JSON
    // Remove quotes from the JSON string
    roleStr.erase(0, 1);
    roleStr.erase(roleStr.size() - 1);

    std::string token = jwt::create()
        .set_issuer("payment-processor-service")
        .set_type("JWT")
        .set_subject(std::to_string(userId))
        .set_payload_claim("username", jwt::claim(username))
        .set_payload_claim("role", jwt::claim(roleStr))
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(expires_at)
        .sign(jwt::algorithm::hs256{jwtSecret});

    Logger::get()->info("Generated JWT for user {}", username);
    return token;
}

std::optional<JwtTokenDetails> CryptoUtils::verifyJwtToken(const std::string& token) {
    if (jwtSecret.empty()) {
        jwtSecret = Config::getJwtSecret();
    }

    try {
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{jwtSecret})
            .with_issuer("payment-processor-service");

        auto decoded_token = jwt::decode(token);
        verifier.verify(decoded_token);

        JwtTokenDetails details;
        details.userId = std::stol(decoded_token.get_subject());
        details.username = decoded_token.get_payload_claim("username").as_string();
        details.role = decoded_token.get_payload_claim("role").as_string();
        details.expiryTime = decoded_token.get_expires_at().time_since_epoch().count();

        Logger::get()->debug("Verified JWT for user {}. Role: {}", details.username, details.role);
        return details;

    } catch (const jwt::verification_error& e) {
        Logger::get()->warn("JWT verification failed: {}", e.what());
        return std::nullopt;
    } catch (const std::exception& e) {
        Logger::get()->error("Error verifying JWT: {}", e.what());
        return std::nullopt;
    }
}

std::string CryptoUtils::generateUuid() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, 15);
    static std::uniform_int_distribution<> dis2(8, 11);

    std::stringstream ss;
    int i;
    ss << std::hex;
    for (i = 0; i < 8; i++) ss << dis(gen);
    ss << "-";
    for (i = 0; i < 4; i++) ss << dis(gen);
    ss << "-4";
    for (i = 0; i < 3; i++) ss << dis(gen);
    ss << "-";
    ss << dis2(gen);
    for (i = 0; i < 3; i++) ss << dis(gen);
    ss << "-";
    for (i = 0; i < 12; i++) ss << dis(gen);
    return ss.str();
}
```