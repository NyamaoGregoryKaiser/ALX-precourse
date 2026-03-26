#pragma once
#include "base_controller.h"
#include "../services/user_service.h"
#include "../utils/jwt_manager.h"
#include <nlohmann/json.hpp>

class AuthController : public BaseController {
public:
    AuthController(UserService& userService, JWTManager& jwtManager)
        : user_service(userService), jwt_manager(jwtManager) {}

    void setup_routes(CMS_Server& server) override;

private:
    UserService& user_service;
    JWTManager& jwt_manager;

    void handle_register(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void handle_login(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
};