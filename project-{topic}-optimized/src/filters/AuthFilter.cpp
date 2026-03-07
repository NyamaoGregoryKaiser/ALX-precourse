```cpp
#include "AuthFilter.h"

void AuthFilter::doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc,
                          drogon::FilterChainCallback&& fcc) {
    std::string authHeader = req->getHeader("Authorization");

    if (authHeader.empty() || authHeader.rfind("Bearer ", 0) != 0) {
        auto resp = ApiResponse::makeUnauthorizedResponse("Bearer token missing or invalid format.");
        return fc(resp);
    }

    std::string token = authHeader.substr(7); // "Bearer ".length() == 7
    std::optional<int> userId = authService_.verifyToken(token);

    if (userId.has_value()) {
        // Store user_id in request attributes for controllers to use
        req->attributes()->insert("user_id", userId.value());
        fcc(); // Continue to the controller
    } else {
        auto resp = ApiResponse::makeUnauthorizedResponse("Invalid or expired token.");
        return fc(resp);
    }
}
```