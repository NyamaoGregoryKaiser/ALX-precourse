```cpp
#ifndef MLTOOLKIT_AUTH_HANDLER_HPP
#define MLTOOLKIT_AUTH_HANDLER_HPP

#include <crow.h>
#include <string>
#include <jwt-cpp/jwt.h>
#include "../../common/Logger.hpp"
#include "../../common/Exceptions.hpp"
#include "../../config/Config.hpp"

namespace MLToolkit {
namespace API {
namespace Handlers {

class AuthHandler {
public:
    // Simple login endpoint for demonstration
    // In a real app, this would involve password hashing, user lookup in DB, etc.
    static crow::response login(const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body || !json_body.has("username") || !json_body.has("password")) {
                throw Common::InvalidArgumentException("Missing username or password in request body.");
            }

            std::string username = json_body["username"].s();
            std::string password = json_body["password"].s();

            // Dummy authentication (replace with actual DB lookup and password verification)
            if (username == "admin" && password == "adminpass") {
                LOG_INFO("User '{}' authenticated successfully. Generating JWT.", username);
                std::string token = generate_jwt_token(username);
                return crow::response(200, crow::json::wvalue({{"status", "success"}, {"token", token}}).dump());
            } else {
                LOG_WARN("Failed login attempt for user: {}", username);
                throw Common::AuthException("Invalid username or password.");
            }
        });
    }

private:
    static std::string generate_jwt_token(const std::string& username) {
        std::string jwt_secret = Config::Config::get_instance().get_string("JWT_SECRET");
        if (jwt_secret.empty()) {
            throw Common::Config::ConfigException("JWT_SECRET is not configured in environment or config file.");
        }

        auto token = jwt::create()
            .set_issuer("ml_toolkit_server")
            .set_subject(username)
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds{3600}) // 1 hour expiration
            .sign(jwt::algorithm::hs256{jwt_secret});
        
        return token;
    }
};

} // namespace Handlers
} // namespace API
} // namespace MLToolkit

#endif // MLTOOLKIT_AUTH_HANDLER_HPP
```