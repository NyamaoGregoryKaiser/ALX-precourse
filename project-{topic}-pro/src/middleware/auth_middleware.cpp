```cpp
#include "auth_middleware.h"
#include <vector>

namespace Middleware {
    void AuthMiddleware::authenticate(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        Logger::debug("AuthMiddleware", "Authenticating request to {}{}", request.resource(), request.query().as_str());
        const auto& headers = request.headers();
        std::string authHeader = headers.tryGet("Authorization").value_or("");

        if (authHeader.empty()) {
            Logger::warn("AuthMiddleware", "Authorization header missing.");
            response.send(Http::Code::Unauthorized, UnauthorizedException("Authorization header missing").toJson().dump());
            throw Pistache::Http::HttpError(Http::Code::Unauthorized); // Halt processing
        }

        if (authHeader.rfind("Bearer ", 0) != 0) { // Check if starts with "Bearer "
            Logger::warn("AuthMiddleware", "Invalid Authorization header format.");
            response.send(Http::Code::Unauthorized, UnauthorizedException("Invalid Authorization header format").toJson().dump());
            throw Pistache::Http::HttpError(Http::Code::Unauthorized);
        }

        std::string token = authHeader.substr(7); // "Bearer ".length() == 7

        std::string userId;
        std::string username;
        if (!JwtManager::getInstance().verifyToken(token, userId, username)) {
            Logger::warn("AuthMiddleware", "Invalid or expired token provided.");
            response.send(Http::Code::Unauthorized, UnauthorizedException("Invalid or expired token").toJson().dump());
            throw Pistache::Http::HttpError(Http::Code::Unauthorized);
        }

        // Store user ID in the request for downstream controllers
        // Pistache doesn't have a direct "request context", so we can use a custom header or map
        // For simplicity, we'll assume controllers can retrieve it by parsing the token again or
        // using a thread_local/static map if necessary. A more robust solution involves custom request objects.
        // For this example, let's pass it via a custom header for demonstration (not ideal in real production, but works for PoC)
        // Or, more simply, the JwtManager can directly return the user_id. Let's make `getUserId` available.
        Logger::debug("AuthMiddleware", "Request authenticated for user ID: {}", userId);
        // Note: Pistache filters can't modify the request object easily for downstream handlers to access data.
        // A common pattern is to either re-parse or use a thread-local storage if the server is single-threaded per request.
        // For now, we assume service methods might take userId as an argument.
    }

    std::string AuthMiddleware::getUserId(const Pistache::Rest::Request& request) {
        // This is a simplified approach. In a real application, the authentication middleware
        // would inject the user ID into the request context, which then the controller accesses.
        // As Pistache doesn't have a direct request context for filters, we're re-parsing the token here.
        // A more efficient design would involve the middleware making user_id available globally
        // via a thread-local variable or a custom request handler wrapper.
        const auto& headers = request.headers();
        std::string authHeader = headers.tryGet("Authorization").value_or("");
        if (authHeader.rfind("Bearer ", 0) == 0) {
            std::string token = authHeader.substr(7);
            std::string userId;
            std::string username;
            if (JwtManager::getInstance().verifyToken(token, userId, username)) {
                return userId;
            }
        }
        throw UnauthorizedException("Could not retrieve user ID from authenticated request.");
    }
} // namespace Middleware
```