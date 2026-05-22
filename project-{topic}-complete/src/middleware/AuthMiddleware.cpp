```cpp
#include "AuthMiddleware.h"
#include "utils/JwtManager.h"
#include "utils/Logger.h"
#include <regex>

const std::string AuthMiddleware::CONTEXT_USER_KEY = "authenticated_user";

void AuthMiddleware::handle(const Pistache::Rest::Request& request) {
    auto auth_header = request.headers().tryGet<Pistache::Http::Header::Authorization>();

    if (!auth_header) {
        LOG_WARN("Authentication failed: Missing Authorization header.");
        throw HttpError(Pistache::Http::Code::Unauthorized, "Authorization token required.");
    }

    const std::string& token = auth_header->value();
    
    // Check if the token starts with "Bearer "
    if (!token.rfind("Bearer ", 0) == 0) { // rfind with 0 checks prefix
        LOG_WARN("Authentication failed: Invalid Authorization header format.");
        throw HttpError(Pistache::Http::Code::Unauthorized, "Invalid token format. Expected 'Bearer <token>'.");
    }

    std::string jwt_token = token.substr(7); // Extract token after "Bearer "

    try {
        JwtManager::verifyToken(jwt_token); // Throws if invalid or expired
        
        std::optional<long> userId = JwtManager::getUserIdFromToken(jwt_token);
        std::optional<std::string> username = JwtManager::getUsernameFromToken(jwt_token);

        if (!userId.has_value() || !username.has_value()) {
            LOG_ERROR("Authentication failed: User ID or username missing in valid JWT.");
            throw HttpError(Pistache::Http::Code::Internal_Server_Error, "Invalid token payload.");
        }

        // Store user info in request context for controllers to use
        CurrentUser current_user {userId.value(), username.value()};
        setCurrentUser(const_cast<Pistache::Rest::Request&>(request), current_user);

        LOG_DEBUG("User {} (ID: {}) authenticated successfully.", username.value(), userId.value());

    } catch (const JwtManager::JwtException& e) {
        LOG_WARN("Authentication failed: JWT error: {}", e.what());
        throw HttpError(Pistache::Http::Code::Unauthorized, e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Authentication failed: Unexpected error during token processing: {}", e.what());
        throw HttpError(Pistache::Http::Code::Internal_Server_Error, "Internal authentication error.");
    }
}

std::optional<CurrentUser> AuthMiddleware::getCurrentUser(const Pistache::Rest::Request& request) {
    if (request.hasParam(CONTEXT_USER_KEY)) {
        // Retrieve the stored CurrentUser struct
        // This relies on Pistache's request context mechanism.
        // A direct cast might be risky, better to store as void* and cast, or use shared_ptr.
        // For simplicity, assuming CurrentUser is stored directly if Pistache's param supports non-string.
        // More robust: use a custom request context object.
        try {
            return request.param(CONTEXT_USER_KEY).as<CurrentUser>();
        } catch (const std::bad_cast& e) {
            LOG_ERROR("Failed to cast CurrentUser from request context: {}", e.what());
            return std::nullopt;
        } catch (const std::exception& e) {
            LOG_ERROR("Error retrieving CurrentUser from request context: {}", e.what());
            return std::nullopt;
        }
    }
    return std::nullopt;
}

void AuthMiddleware::setCurrentUser(Pistache::Rest::Request& request, CurrentUser user) {
    // Pistache's request.addParam is primarily for path parameters.
    // For general context, we need a different approach.
    // One common method is to use a thread-local map in the application scope,
    // or extend Pistache's request object.
    // For this example, let's simplify and just store it as a generic param if the type is simple.
    // A better approach would be:
    // `request.attribute<CurrentUser>(CONTEXT_USER_KEY) = user;` if Pistache supported it directly.
    // For demonstration, we'll store user_id as a long param, and username as string param.
    // This is a workaround, a proper request context or thread-local would be better.
    request.addParam(Pistache::Rest::Router::Param(CONTEXT_USER_KEY + "_id", std::to_string(user.id)));
    request.addParam(Pistache::Rest::Router::Param(CONTEXT_USER_KEY + "_username", user.username));
}
```