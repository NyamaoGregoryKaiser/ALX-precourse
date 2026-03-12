```cpp
#ifndef PAYMENT_PROCESSOR_AUTH_MIDDLEWARE_HPP
#define PAYMENT_PROCESSOR_AUTH_MIDDLEWARE_HPP

#include <Pistache/Endpoint.h>
#include <Pistache/Http.h>
#include <Pistache/Router.h>
#include "util/CryptoUtils.hpp"
#include "util/Logger.hpp"
#include "exceptions/ApiException.hpp"

namespace Middleware {

    // A simple context structure to pass user info through the request
    struct RequestContext {
        long userId;
        std::string username;
        UserRole role;

        RequestContext(long id, std::string name, UserRole r)
            : userId(id), username(std::move(name)), role(r) {}
    };

    class AuthMiddleware {
    public:
        // This function will be called as a Pistache handler for routes that need authentication
        static void authenticate(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
            Logger::get()->debug("AuthMiddleware: Authenticating request...");
            try {
                const auto& authHeader = request.headers().tryGet<Pistache::Http::Header::Authorization>();

                if (!authHeader) {
                    throw UnauthorizedException("Authorization header missing.");
                }

                std::string token = authHeader->value();
                if (token.length() < 7 || token.substr(0, 6) != "Bearer") {
                    throw UnauthorizedException("Invalid Authorization header format.");
                }
                token = token.substr(7); // Extract token part

                std::optional<JwtTokenDetails> tokenDetails = CryptoUtils::verifyJwtToken(token);

                if (!tokenDetails.has_value()) {
                    throw UnauthorizedException("Invalid or expired token.");
                }

                // Attach user details to the request for downstream controllers
                // This is a common pattern, though Pistache's request object is const.
                // A common workaround is to use thread_local storage for context or pass it explicitly.
                // For demonstration, we'll imagine it's attached, or passed via a custom request type.
                // In a real Pistache setup, you might use a custom Router handler wrapper or std::function bind.

                // For now, let's just proceed with the `next` handler if auth is successful.
                // If we needed to pass context, it would look like:
                // request.setUserData(new RequestContext(tokenDetails->userId, tokenDetails->username, ...));
                // And then in the controller: auto* ctx = request.userData<RequestContext>();

                Logger::get()->debug("AuthMiddleware: User {} (ID: {}) authenticated successfully.", tokenDetails->username, tokenDetails->userId);

                // Create a temporary mutable request or use a wrapper to inject context
                // This is a common challenge with `const Pistache::Rest::Request&`.
                // For simplicity, we'll proceed and assume downstream logic gets user ID/role via another mechanism
                // or that we're passing it around manually.
                // A more robust Pistache setup might involve custom handler adaptors or a thread-local context.

                // Let's pass user info as request attributes (Pistache does not directly support this in `const Request&` from middleware)
                // For demonstration, we will rely on controllers re-parsing the token if needed, or using a thread_local context.
                // For this example, we'll simply let 'next' proceed, assuming authorization happens later.

                // A better approach for Pistache is to *not* pass custom data into `const Request&` directly in middleware,
                // but rather define separate `Controller` classes that take a `AuthService` dependency
                // and parse the token themselves within the controller method, after the middleware ensures its existence.

                // Alternatively, define a custom Request type or use thread_local for request context.
                // For now, we will just call next() and handle user context in controllers by re-parsing (less efficient but simpler to demo).
                // Or, for the sake of completeness, let's assume `request` had a way to attach context.
                // We'll define a simple wrapper to make it seem like context is passed.

                // --- REVISED APPROACH FOR PISTACHE CONTEXT ---
                // We'll pass the token details directly to the next function using std::bind,
                // assuming our controller methods are adapted to accept it.
                // This will require changes to `HttpServer` and `controllers`.
                // For simplicity in this example, let's just ensure the token is valid,
                // and controllers will retrieve `userId` and `role` by re-verifying the token,
                // or we'll define a separate `AuthController` function that returns the details.

                // Original simple flow:
                next(request, std::move(response));

            } catch (const ApiException& e) {
                Logger::get()->warn("AuthMiddleware: Authorization failed: {}", e.what());
                response.send(e.getStatusCode(), e.what());
            } catch (const std::exception& e) {
                Logger::get()->error("AuthMiddleware: Unexpected error: {}", e.what());
                response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error during authentication.");
            }
        }
    };
} // namespace Middleware

#endif // PAYMENT_PROCESSOR_AUTH_MIDDLEWARE_HPP
```