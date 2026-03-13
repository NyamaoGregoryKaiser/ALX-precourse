#ifndef CMS_AUTH_ROUTES_HPP
#define CMS_AUTH_ROUTES_HPP

#include <pistache/router.h>
#include <pistache/http.h>
#include <nlohmann/json.hpp>
#include <memory>
#include "../auth/auth_service.hpp"
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "../models/user.hpp"

namespace cms::api {

using json = nlohmann::json;

class AuthRoutes {
public:
    explicit AuthRoutes(std::shared_ptr<cms::auth::AuthService> auth_service)
        : auth_service_(std::move(auth_service)) {
        if (!auth_service_) {
            throw std::runtime_error("AuthRoutes requires a valid AuthService.");
        }
    }

    void setup_routes(Pistache::Rest::Router& router) {
        Pistache::Rest::Routes::Post(router, "/auth/register", Pistache::Rest::Routes::bind(&AuthRoutes::register_user, this));
        Pistache::Rest::Routes::Post(router, "/auth/login", Pistache::Rest::Routes::bind(&AuthRoutes::login_user, this));
    }

private:
    std::shared_ptr<cms::auth::AuthService> auth_service_;

    void register_user(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /auth/register request.");
        try {
            json req_body = json::parse(request.body());
            
            std::string username = common::get_json_string_required(req_body, "username");
            std::string email = common::get_json_string_required(req_body, "email");
            std::string password = common::get_json_string_required(req_body, "password");

            auto [user, token] = auth_service_->register_user(username, email, password);

            json res_body = {
                {"message", "User registered successfully"},
                {"token", token},
                {"user", user.to_json()}
            };
            response.send(Pistache::Http::Code::Created, res_body.dump(), MIME(Application, Json));
        } catch (const cms::common::BadRequestException& e) {
            throw; // Re-throw for global error handler
        } catch (const cms::common::ConflictException& e) {
            throw;
        } catch (const json::exception& e) {
            throw cms::common::BadRequestException("Invalid JSON payload: " + std::string(e.what()));
        } catch (const std::exception& e) {
            LOG_ERROR("Error in register_user: {}", e.what());
            throw cms::common::InternalServerError("Failed to register user.");
        }
    }

    void login_user(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /auth/login request.");
        try {
            json req_body = json::parse(request.body());

            std::string username = common::get_json_string_required(req_body, "username");
            std::string password = common::get_json_string_required(req_body, "password");

            std::optional<std::string> token = auth_service_->login_user(username, password);

            if (token) {
                json res_body = {
                    {"message", "Login successful"},
                    {"token", *token}
                };
                response.send(Pistache::Http::Code::Ok, res_body.dump(), MIME(Application, Json));
            } else {
                throw cms::common::UnauthorizedException("Invalid username or password.");
            }
        } catch (const cms::common::BadRequestException& e) {
            throw;
        } catch (const cms::common::UnauthorizedException& e) {
            throw;
        } catch (const json::exception& e) {
            throw cms::common::BadRequestException("Invalid JSON payload: " + std::string(e.what()));
        } catch (const std::exception& e) {
            LOG_ERROR("Error in login_user: {}", e.what());
            throw cms::common::InternalServerError("Failed to login.");
        }
    }
};

} // namespace cms::api

#endif // CMS_AUTH_ROUTES_HPP
```