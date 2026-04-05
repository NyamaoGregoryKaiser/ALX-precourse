```cpp
#ifndef ADMIN_FILTER_H
#define ADMIN_FILTER_H

#include <drogon/drogon.h>
#include <string>
#include <memory>
#include "utils/AppErrors.h" // For AuthException

namespace TaskManager {

/**
 * @brief HTTP filter for authorizing requests based on admin role.
 *
 * This filter assumes AuthFilter has already run and populated user_role in request attributes.
 * It checks if the user_role is "admin".
 */
class AdminFilter : public drogon::HttpFilter<AdminFilter> {
public:
    AdminFilter() {}

    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc_callback,
                          drogon::FilterChainCallback&& fcc_callback) override {
        // Assume AuthFilter has already populated user_role
        if (!req->attributes()->find("user_role")) {
            // This should ideally not happen if AuthFilter is chained before AdminFilter
            LOG_ERROR << "AdminFilter ran before user_role was set in request context. Authentication flow error.";
            auto resp = drogon::HttpResponse::newHttp401Response();
            resp->setBody(Json::Value("Authentication required.").toStyledString());
            fc_callback(resp);
            return;
        }

        const std::string& userRole = req->attributes()->get<std::string>("user_role");

        if (userRole == "admin") {
            // User is an admin, proceed
            fcc_callback();
        } else {
            // Not an admin, send 403 Forbidden
            auto resp = drogon::HttpResponse::newHttp403Response();
            resp->setBody(Json::Value("Forbidden: Admin access required.").toStyledString());
            fc_callback(resp);
        }
    }
};

} // namespace TaskManager

#endif // ADMIN_FILTER_H
```