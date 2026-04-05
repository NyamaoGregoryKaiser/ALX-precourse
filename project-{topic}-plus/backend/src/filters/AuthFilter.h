```cpp
#ifndef AUTH_FILTER_H
#define AUTH_FILTER_H

#include <drogon/drogon.h>
#include <string>
#include <vector>
#include <memory>
#include "utils/JwtHandler.h"
#include "utils/AppErrors.h"

namespace TaskManager {

/**
 * @brief HTTP filter for authenticating requests using JWT.
 *
 * This filter extracts the JWT from the Authorization header, verifies it,
 * and if valid, stores the decoded user claims in the request context for
 * subsequent controllers/services to use.
 */
class AuthFilter : public drogon::HttpFilter<AuthFilter> {
public:
    AuthFilter() : _jwtHandler() {}

    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc_callback,
                          drogon::FilterChainCallback&& fcc_callback) override {
        // Extract token from Authorization header
        const std::string& authHeader = req->getHeader("authorization");
        if (authHeader.empty() || authHeader.rfind("Bearer ", 0) != 0) {
            auto resp = drogon::HttpResponse::newHttp401Response();
            resp->setBody(Json::Value("Missing or invalid Authorization header.").toStyledString());
            fc_callback(resp);
            return;
        }

        std::string token = authHeader.substr(7); // "Bearer ".length() == 7

        // Verify token
        std::optional<JwtClaims> claims = _jwtHandler.verifyToken(token);
        if (!claims) {
            auto resp = drogon::HttpResponse::newHttp401Response();
            resp->setBody(Json::Value("Invalid or expired token.").toStyledString());
            fc_callback(resp);
            return;
        }

        // Store claims in request context for controllers to use
        req->attributes()->insert("user_id", claims->userId);
        req->attributes()->insert("user_role", claims->role);
        req->attributes()->insert("username", claims->username);

        // Continue to the next filter or controller
        fcc_callback();
    }

private:
    JwtHandler _jwtHandler;
};

} // namespace TaskManager

#endif // AUTH_FILTER_H
```