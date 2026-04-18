#include "jwt_manager.h"
#include "logger.h"

JwtManager::JwtManager(const std::string& secret, long expiration_seconds)
    : secret_(secret), expiration_seconds_(expiration_seconds),
      verifier_(jwt::verify()
                    .allow_algorithm(jwt::algorithm::hs256{secret_}) // Only allow HS256
                    .with_issuer("project-management-api")
                    .leeway(60) // 1 minute leeway for clock skew
                )
{
    if (secret_.length() < 32) { // Recommended minimum for HS256
        Logger::warn("JWT_SECRET is too short ({} chars). Recommended >= 32 characters for HS256.", secret_.length());
    }
    Logger::info("JwtManager initialized. Token expiration: {} seconds.", expiration_seconds_);
}

std::string JwtManager::generateToken(const std::string& user_id, const std::string& username, const std::string& email) {
    auto token = jwt::create()
        .set_issuer("project-management-api")
        .set_type("JWT")
        .set_subject(user_id)
        .set_id(jwt::random().get<32>()) // Unique JWT ID
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds(expiration_seconds_))
        .set_payload_claim("user_id", jwt::claim(user_id))
        .set_payload_claim("username", jwt::claim(username))
        .set_payload_claim("email", jwt::claim(email))
        .sign(jwt::algorithm::hs256{secret_});

    Logger::debug("Generated JWT for user_id: {}", user_id);
    return token;
}

jwt::decoded_token JwtManager::verifyToken(const std::string& token_string) {
    try {
        auto decoded_token = jwt::decode(token_string);
        verifier_.verify(decoded_token); // Throws on verification failure
        Logger::debug("Verified JWT for user_id: {}", decoded_token.get_subject());
        return decoded_token;
    } catch (const jwt::signature_verification_error& e) {
        Logger::warn("JWT signature verification failed: {}", e.what());
        throw;
    } catch (const jwt::token_verification_error& e) {
        Logger::warn("JWT token verification failed: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::error("Generic error during JWT verification: {}", e.what());
        throw;
    }
}
```