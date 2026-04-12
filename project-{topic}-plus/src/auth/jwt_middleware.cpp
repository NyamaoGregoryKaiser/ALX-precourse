#include "jwt_middleware.h"

JwtMiddleware::JwtMiddleware(AuthService& auth_service)
    : auth_service_(auth_service) {
    LOG_INFO("JWT Middleware initialized.");
}

void JwtMiddleware::authenticate(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
    // 1. Extract token from Authorization header
    auto auth_header = request.headers().tryGet<Pistache::Http::Header::Authorization>();
    if (!auth_header) {
        throw AuthenticationRequiredException("Authorization header missing.");
    }

    std::string token_str = auth_header->value();
    if (token_str.rfind("Bearer ", 0) != 0) { // Check for "Bearer " prefix
        throw AuthenticationRequiredException("Invalid Authorization header format. Expected 'Bearer <token>'.");
    }

    token_str = token_str.substr(7); // Remove "Bearer " prefix

    // 2. Verify token
    std::optional<JwtPayload> payload = auth_service_.verify_token(token_str);
    if (!payload) {
        throw UnauthorizedException("Invalid or expired token.");
    }

    // 3. Inject authenticated user info into the request context
    // Pistache allows setting arbitrary data in the request.
    // We'll use a unique key to store our AuthContext.
    request.setUserData(reinterpret_cast<void*>(1), new AuthContext{payload->user_id, payload->username, payload->role});
    LOG_DEBUG("Authenticated user: " + payload->username + " (ID: " + std::to_string(payload->user_id) + ", Role: " + user_role_to_string(payload->role) + ")");

    // 4. Call the next middleware/route handler
    next(request, std::move(response));

    // Clean up AuthContext if allocated with `new`
    // This part is tricky with Pistache's userData and lifetime.
    // A simpler approach might be to pass `AuthContext` by reference if possible,
    // or rely on the request object's destruction. For this example, we'll
    // assume ownership is passed and cleared by a request lifecycle manager,
    // or that `request.setUserData` copies if using simple types.
    // For a complex type like `AuthContext`, typically a `unique_ptr` would be passed.
    // Pistache's `UserData` is void*, requiring manual management.
    // For simplicity, we'll cast to unique int values for different user data.
    // A more robust system would involve a custom request context object.
    delete static_cast<AuthContext*>(request.getUserData(reinterpret_cast<void*>(1)));
}

void JwtMiddleware::require_role(UserRole required_role, const Pistache::Rest::Request& request) {
    AuthContext* auth_context = static_cast<AuthContext*>(request.getUserData(reinterpret_cast<void*>(1)));
    if (!auth_context) {
        // This should ideally not happen if authenticate() ran correctly,
        // but it's a safeguard.
        throw InternalServerException("Authentication context missing after JWT verification.");
    }

    if (auth_context->role < required_role) {
        LOG_WARN("User " + auth_context->username + " (Role: " + user_role_to_string(auth_context->role) + ") attempted to access resource requiring " + user_role_to_string(required_role) + " role.");
        throw ForbiddenException("Access denied. Insufficient permissions.");
    }
    LOG_DEBUG("User " + auth_context->username + " has required role " + user_role_to_string(required_role) + ".");
}
```