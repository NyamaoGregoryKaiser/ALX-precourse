#ifndef AUTH_MIDDLEWARE_H
#define AUTH_MIDDLEWARE_H

#include <drogon/HttpFilter.h>
#include <drogon/orm/DbClient.h>
#include <json/json.h>
#include <string>
#include <vector>

class AuthMiddleware : public drogon::HttpFilter<AuthMiddleware> {
public:
    AuthMiddleware() = default; // Default constructor
    AuthMiddleware(drogon::orm::DbClientPtr dbClient); // Constructor to inject DbClient
    ~AuthMiddleware() = default;

    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc_success,
                          drogon::FilterCallback&& fc_fail) override;

    /**
     * @brief Sets required roles for a route.
     * @param roles A vector of role names.
     */
    void setRequiredRoles(const std::vector<std::string>& roles);

    /**
     * @brief Checks if a user has any of the required roles.
     * @param userRoles The roles assigned to the user.
     * @return True if the user has at least one required role, false otherwise.
     */
    bool hasRequiredRole(const std::vector<std::string>& userRoles) const;

private:
    drogon::orm::DbClientPtr dbClient_;
    std::string jwtSecret_;
    std::vector<std::string> requiredRoles_;

    void loadJwtSecret();
    drogon::AsyncTask<bool> isTokenBlacklisted(const std::string& token);
    drogon::AsyncTask<std::vector<std::string>> getUserRolesFromDb(int64_t userId);
};

#endif // AUTH_MIDDLEWARE_H
```