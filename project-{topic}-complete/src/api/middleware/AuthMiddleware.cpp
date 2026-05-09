```cpp
#include "AuthMiddleware.h"
#include "util/ErrorHandler.h"
#include "core/config/ConfigManager.h" // To get JWT secret

namespace VisuFlow {
namespace API {

AuthMiddleware::AuthMiddleware()
    : m_jwtManager(Core::Config::ConfigManager::getInstance().getString("jwt_secret", "supersecretjwtkey")) {}

bool AuthMiddleware::handleRequest(const Http::Rest::Request& req, Http::Rest::Response& res) {
    std::string token = extractToken(req);

    if (token.empty()) {
        VisuFlow::Util::ErrorHandler::handleAPIException(VisuFlow::Util::APIException("Missing authentication token", 401), res);
        return false;
    }

    try {
        Core::Security::JwtPayload payload = m_jwtManager.verifyToken(token);
        // Store payload in request context for later handlers (conceptual)
        // For Pistache: `req.add<Core::Security::JwtPayload>(payload);`
        VisuFlow::Util::Logger::log(spdlog::level::debug, "User {} (ID: {}) authenticated via JWT.", payload.username, payload.userId);
        return true;
    } catch (const std::exception& e) {
        VisuFlow::Util::ErrorHandler::handleAPIException(VisuFlow::Util::APIException(std::string("Invalid or expired token: ") + e.what(), 401), res);
        return false;
    }
}

std::string AuthMiddleware::extractToken(const Http::Rest::Request& req) {
    // Conceptual: In a real Pistache/Crow/etc. app, you'd get the "Authorization" header.
    // E.g., `req.headers().has<Http::Header::Authorization>()`
    // For this mock, assume the token is part of the request string for simplicity, like "Authorization: Bearer <token>"
    size_t authHeaderPos = req.find("Authorization: Bearer ");
    if (authHeaderPos != std::string::npos) {
        return req.substr(authHeaderPos + std::string("Authorization: Bearer ").length());
    }
    return "";
}

} // namespace API
} // namespace VisuFlow
```