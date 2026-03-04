#pragma once

#include "server/HttpServer.h"
#include "database/DBManager.h"
#include "database/models/User.h"
#include "utils/JWT.h"
#include "utils/Logger.h"
#include "nlohmann/json.hpp"

class AuthController {
public:
    AuthController(DBManager& db_manager, const std::string& jwt_secret);

    HttpResponse registerUser(const HttpRequest& req);
    HttpResponse loginUser(const HttpRequest& req);

private:
    DBManager& db_manager_;
    std::string jwt_secret_;

    // Helper to hash passwords (e.g., using Argon2, bcrypt, scrypt)
    // Placeholder, real implementation needs a crypto library.
    std::string hashPassword(const std::string& password);
    // Helper to verify passwords
    bool verifyPassword(const std::string& password, const std::string& hashed_password);
};