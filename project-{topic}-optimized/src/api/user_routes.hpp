#ifndef CMS_USER_ROUTES_HPP
#define CMS_USER_ROUTES_HPP

#include <pistache/router.h>
#include <pistache/http.h>
#include <nlohmann/json.hpp>
#include <memory>
#include "../services/user_service.hpp"
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "auth_middleware.hpp" // For AuthContext

namespace cms::api {

using json = nlohmann::json;

class UserRoutes {
public:
    explicit UserRoutes(std::shared_ptr<cms::services::UserService> user_service)
        : user_service_(std::move(user_service)) {
        if (!user_service_) {
            throw std::runtime_error("UserRoutes requires a valid UserService.");
        }
    }

    void setup_routes(Pistache::Rest::Router& router) {
        // GET /users - Get all users (Admin only)
        Pistache::Rest::Routes::Get(router, "/", Pistache::Rest::Routes::bind(&UserRoutes::get_all_users, this));
        // GET /users/:id - Get user by ID (Authenticated users, admins can get any)
        Pistache::Rest::Routes::Get(router, "/:id", Pistache::Rest::Routes::bind(&UserRoutes::get_user_by_id, this));
        // PUT /users/:id - Update user by ID (Authenticated users, admins can update any)
        Pistache::Rest::Routes::Put(router, "/:id", Pistache::Rest::Routes::bind(&UserRoutes::update_user, this));
        // DELETE /users/:id - Delete user by ID (Admin only)
        Pistache::Rest::Routes::Delete(router, "/:id", Pistache::Rest::Routes::bind(&UserRoutes::delete_user, this));
    }

private:
    std::shared_ptr<cms::services::UserService> user_service_;

    void get_all_users(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /users GET request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            int limit = request.query().has("limit") ? std::stoi(request.query().get("limit").get()) : 10;
            int offset = request.query().has("offset") ? std::stoi(request.query().get("offset").get()) : 0;

            std::vector<cms::models::User> users = user_service_->get_all_users(limit, offset, auth_req.auth_context);
            
            json user_list = json::array();
            for (const auto& user : users) {
                user_list.push_back(user.to_json());
            }

            response.send(Pistache::Http::Code::Ok, user_list.dump(), MIME(Application, Json));
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in get_all_users: {}", e.what());
            throw cms::common::InternalServerError("Failed to retrieve users.");
        }
    }

    void get_user_by_id(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /users/:id GET request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            std::string user_id = request.param(":id").as<std::string>();

            // Authorization: User can view their own profile, or admin can view any.
            if (user_id != auth_req.auth_context.user_id && !auth_req.auth_context.has_role(cms::models::UserRole::ADMIN)) {
                throw cms::common::ForbiddenException("You are not authorized to view this user's profile.");
            }

            std::optional<cms::models::User> user = user_service_->get_user_by_id(user_id);
            if (user) {
                response.send(Pistache::Http::Code::Ok, user->to_json().dump(), MIME(Application, Json));
            } else {
                throw cms::common::NotFoundException("User not found.");
            }
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in get_user_by_id: {}", e.what());
            throw cms::common::InternalServerError("Failed to retrieve user.");
        }
    }

    void update_user(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /users/:id PUT request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            std::string user_id = request.param(":id").as<std::string>();
            json req_body = json::parse(request.body());

            cms::models::User::UpdateFields updates = cms::models::User::update_from_json(req_body);
            
            std::optional<cms::models::User> updated_user = user_service_->update_user(user_id, updates, auth_req.auth_context);
            
            if (updated_user) {
                response.send(Pistache::Http::Code::Ok, updated_user->to_json().dump(), MIME(Application, Json));
            } else {
                throw cms::common::NotFoundException("User not found.");
            }
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::BadRequestException& e) {
            throw;
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const cms::common::ConflictException& e) {
            throw;
        } catch (const json::exception& e) {
            throw cms::common::BadRequestException("Invalid JSON payload: " + std::string(e.what()));
        } catch (const std::exception& e) {
            LOG_ERROR("Error in update_user: {}", e.what());
            throw cms::common::InternalServerError("Failed to update user.");
        }
    }

    void delete_user(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /users/:id DELETE request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            std::string user_id = request.param(":id").as<std::string>();

            bool deleted = user_service_->delete_user(user_id, auth_req.auth_context);
            if (deleted) {
                response.send(Pistache::Http::Code::No_Content);
            } else {
                throw cms::common::NotFoundException("User not found.");
            }
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::BadRequestException& e) {
            throw;
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in delete_user: {}", e.what());
            throw cms::common::InternalServerError("Failed to delete user.");
        }
    }
};

} // namespace cms::api

#endif // CMS_USER_ROUTES_HPP
```