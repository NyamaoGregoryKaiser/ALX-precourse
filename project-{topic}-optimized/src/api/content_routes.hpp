#ifndef CMS_CONTENT_ROUTES_HPP
#define CMS_CONTENT_ROUTES_HPP

#include <pistache/router.h>
#include <pistache/http.h>
#include <nlohmann/json.hpp>
#include <memory>
#include "../services/content_service.hpp"
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "auth_middleware.hpp" // For AuthContext

namespace cms::api {

using json = nlohmann::json;

class ContentRoutes {
public:
    explicit ContentRoutes(std::shared_ptr<cms::services::ContentService> content_service)
        : content_service_(std::move(content_service)) {
        if (!content_service_) {
            throw std::runtime_error("ContentRoutes requires a valid ContentService.");
        }
    }

    void setup_routes(Pistache::Rest::Router& router) {
        // GET /content - Get all content (filtered by status and role)
        Pistache::Rest::Routes::Get(router, "/", Pistache::Rest::Routes::bind(&ContentRoutes::get_all_content, this));
        // POST /content - Create new content (Editor/Admin only)
        Pistache::Rest::Routes::Post(router, "/", Pistache::Rest::Routes::bind(&ContentRoutes::create_content, this));
        // GET /content/:id - Get content by ID
        Pistache::Rest::Routes::Get(router, "/:id", Pistache::Rest::Routes::bind(&ContentRoutes::get_content_by_id, this));
        // PUT /content/:id - Update content by ID (Author/Admin only)
        Pistache::Rest::Routes::Put(router, "/:id", Pistache::Rest::Routes::bind(&ContentRoutes::update_content, this));
        // DELETE /content/:id - Delete content by ID (Author/Admin only)
        Pistache::Rest::Routes::Delete(router, "/:id", Pistache::Rest::Routes::bind(&ContentRoutes::delete_content, this));
        // GET /content/slug/:slug - Get content by slug (publicly accessible for published content)
        Pistache::Rest::Routes::Get(router, "/slug/:slug", Pistache::Rest::Routes::bind(&ContentRoutes::get_content_by_slug, this));
    }

private:
    std::shared_ptr<cms::services::ContentService> content_service_;

    void get_all_content(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /content GET request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            int limit = request.query().has("limit") ? std::stoi(request.query().get("limit").get()) : 10;
            int offset = request.query().has("offset") ? std::stoi(request.query().get("offset").get()) : 0;
            std::string status_filter = request.query().has("status") ? request.query().get("status").get() : "";

            std::vector<cms::models::Content> content_list = content_service_->get_all_content(limit, offset, status_filter, auth_req.auth_context);
            
            json res_array = json::array();
            for (const auto& content : content_list) {
                res_array.push_back(content.to_json());
            }

            response.send(Pistache::Http::Code::Ok, res_array.dump(), MIME(Application, Json));
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in get_all_content: {}", e.what());
            throw cms::common::InternalServerError("Failed to retrieve content.");
        }
    }

    void create_content(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /content POST request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            json req_body = json::parse(request.body());

            cms::models::Content new_content = cms::models::Content::from_json_create(req_body, auth_req.auth_context.user_id);
            
            cms::models::Content created_content = content_service_->create_content(new_content, auth_req.auth_context);

            response.send(Pistache::Http::Code::Created, created_content.to_json().dump(), MIME(Application, Json));
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::BadRequestException& e) {
            throw;
        } catch (const cms::common::ConflictException& e) {
            throw;
        } catch (const json::exception& e) {
            throw cms::common::BadRequestException("Invalid JSON payload: " + std::string(e.what()));
        } catch (const std::exception& e) {
            LOG_ERROR("Error in create_content: {}", e.what());
            throw cms::common::InternalServerError("Failed to create content.");
        }
    }

    void get_content_by_id(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /content/:id GET request.");
        try {
            std::string content_id = request.param(":id").as<std::string>();
            const auto& auth_req = as_authenticated_request(request); // Still need auth context for permissions check

            std::optional<cms::models::Content> content = content_service_->get_content_by_id(content_id);
            if (content) {
                // If content is not published and user is not author/admin, deny
                if (content->status != cms::models::ContentStatus::PUBLISHED &&
                    content->author_id != auth_req.auth_context.user_id &&
                    !auth_req.auth_context.has_role(cms::models::UserRole::ADMIN)) {
                    throw cms::common::ForbiddenException("You are not authorized to view this content.");
                }
                response.send(Pistache::Http::Code::Ok, content->to_json().dump(), MIME(Application, Json));
            } else {
                throw cms::common::NotFoundException("Content not found.");
            }
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in get_content_by_id: {}", e.what());
            throw cms::common::InternalServerError("Failed to retrieve content.");
        }
    }

    void get_content_by_slug(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /content/slug/:slug GET request.");
        try {
            std::string slug = request.param(":slug").as<std::string>();
            const auto& auth_req = as_authenticated_request(request);

            std::optional<cms::models::Content> content = content_service_->get_content_by_slug(slug);
            if (content) {
                // Public access only for published content
                if (content->status != cms::models::ContentStatus::PUBLISHED &&
                    content->author_id != auth_req.auth_context.user_id &&
                    !auth_req.auth_context.has_role(cms::models::UserRole::ADMIN)) {
                    throw cms::common::ForbiddenException("You are not authorized to view this content.");
                }
                response.send(Pistache::Http::Code::Ok, content->to_json().dump(), MIME(Application, Json));
            } else {
                throw cms::common::NotFoundException("Content not found.");
            }
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in get_content_by_slug: {}", e.what());
            throw cms::common::InternalServerError("Failed to retrieve content by slug.");
        }
    }


    void update_content(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /content/:id PUT request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            std::string content_id = request.param(":id").as<std::string>();
            json req_body = json::parse(request.body());

            cms::models::Content::UpdateFields updates = cms::models::Content::update_from_json(req_body);
            
            std::optional<cms::models::Content> updated_content = content_service_->update_content(content_id, updates, auth_req.auth_context);
            
            if (updated_content) {
                response.send(Pistache::Http::Code::Ok, updated_content->to_json().dump(), MIME(Application, Json));
            } else {
                throw cms::common::NotFoundException("Content not found.");
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
            LOG_ERROR("Error in update_content: {}", e.what());
            throw cms::common::InternalServerError("Failed to update content.");
        }
    }

    void delete_content(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /content/:id DELETE request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            std::string content_id = request.param(":id").as<std::string>();

            bool deleted = content_service_->delete_content(content_id, auth_req.auth_context);
            if (deleted) {
                response.send(Pistache::Http::Code::No_Content);
            } else {
                throw cms::common::NotFoundException("Content not found.");
            }
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in delete_content: {}", e.what());
            throw cms::common::InternalServerError("Failed to delete content.");
        }
    }
};

} // namespace cms::api

#endif // CMS_CONTENT_ROUTES_HPP
```