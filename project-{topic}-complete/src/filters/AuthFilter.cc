```cpp
#include "AuthFilter.h"
#include <drogon/drogon.h>

namespace CMS::Filters {

AuthFilter::AuthFilter() : authService_(drogon::app().getDbClient()) {}

void AuthFilter::doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc,
                          drogon::FilterChainCallback&& fcc) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    std::string token;

    // 1. Check for JWT in Authorization header (Bearer token)
    if (req->getHeaders().count("Authorization")) {
        std::string authHeader = req->getHeader("Authorization");
        if (authHeader.rfind("Bearer ", 0) == 0) { // Check if starts with "Bearer "
            token = authHeader.substr(7);
        }
    }
    
    // 2. Fallback: Check for JWT in session (for web/SSR login)
    if (token.empty()) {
        auto session = req->session();
        if (session->find("jwt_token")) {
            token = session->get<std::string>("jwt_token");
        }
    }

    if (token.empty()) {
        resp->setStatusCode(drogon::k401Unauthorized);
        resp->setBody("{\"error\":\"Authorization token missing\"}");
        fc(resp);
        return;
    }

    auto authResult = authService_.verifyToken(token);
    if (authResult) {
        // Token is valid, pass user ID and role to the request context
        req->attributes()->insert("userId", authResult->first);
        req->attributes()->insert("userRole", authResult->second);
        
        // Optionally, update session for web requests to extend validity or refresh token
        if (req->session()->find("jwt_token")) {
            // Re-authenticate silently to keep session token fresh (if desired logic)
            // Or simply update session expiry.
        }

        fcc(); // Continue to the controller
    } else {
        resp->setStatusCode(drogon::k401Unauthorized);
        resp->setBody("{\"error\":\"Invalid or expired token\"}");
        fc(resp);
    }
}

} // namespace CMS::Filters
```