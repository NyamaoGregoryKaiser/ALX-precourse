#ifndef CMS_API_ROUTER_HPP
#define CMS_API_ROUTER_HPP

#include <pistache/endpoint.h>
#include <pistache/http.h>
#include <pistache/router.h>
#include <memory>
#include <string>
#include <filesystem>

#include "middleware.hpp"
#include "auth_middleware.hpp"
#include "auth_routes.hpp"
#include "user_routes.hpp"
#include "content_routes.hpp"
#include "media_routes.hpp"

#include "../common/config.hpp"
#include "../common/logger.hpp"

namespace cms::api {

namespace fs = std::filesystem;

class ApiRouter {
public:
    ApiRouter(std::shared_ptr<cms::auth::AuthService> auth_service,
              std::shared_ptr<cms::services::UserService> user_service,
              std::shared_ptr<cms::services::ContentService> content_service,
              std::shared_ptr<cms::services::MediaService> media_service,
              std::shared_ptr<cms::auth::JwtManager> jwt_manager)
        : auth_service_(std::move(auth_service)),
          user_service_(std::move(user_service)),
          content_service_(std::move(content_service)),
          media_service_(std::move(media_service)),
          jwt_manager_(std::move(jwt_manager)) {
        if (!auth_service_ || !user_service_ || !content_service_ || !media_service_ || !jwt_manager_) {
            throw std::runtime_error("ApiRouter requires valid service and manager dependencies.");
        }
        setup_routes();
    }

    Pistache::Rest::Router& get_router() {
        return router_;
    }

private:
    Pistache::Rest::Router router_;
    std::shared_ptr<cms::auth::AuthService> auth_service_;
    std::shared_ptr<cms::services::UserService> user_service_;
    std::shared_ptr<cms::services::ContentService> content_service_;
    std::shared_ptr<cms::services::MediaService> media_service_;
    std::shared_ptr<cms::auth::JwtManager> jwt_manager_;

    void setup_routes() {
        // Global Middleware
        // Order matters: Rate Limiting -> Logging -> Auth -> Route Handler -> Error Handling
        // Pistache Router itself acts as error handler for uncaught exceptions,
        // so `handle_error` is registered as a general error handler.
        router_.addMiddleware(log_requests);
        router_.addMiddleware(RateLimitMiddleware().handle);

        // Authentication Middleware
        AuthMiddleware auth_middleware(jwt_manager_);

        // Health Check
        Pistache::Rest::Routes::Get(router_, "/health", Pistache::Rest::Routes::bind(&ApiRouter::health_check, this));

        // Auth Routes
        AuthRoutes auth_routes(auth_service_);
        auth_routes.setup_routes(router_);

        // User Routes (protected by AuthMiddleware)
        UserRoutes user_routes(user_service_);
        Pistache::Rest::Routes::Group(router_, "/users", [&] (Pistache::Rest::Router& userRoutes) {
            userRoutes.addMiddleware(Pistache::Rest::Routes::bind(&AuthMiddleware::handle, &auth_middleware));
            user_routes.setup_routes(userRoutes);
        });

        // Content Routes (protected by AuthMiddleware)
        ContentRoutes content_routes(content_service_);
        Pistache::Rest::Routes::Group(router_, "/content", [&] (Pistache::Rest::Router& contentRoutes) {
            contentRoutes.addMiddleware(Pistache::Rest::Routes::bind(&AuthMiddleware::handle, &auth_middleware));
            content_routes.setup_routes(contentRoutes);
        });
        
        // Media Routes (protected by AuthMiddleware for upload/delete, public for serving)
        MediaRoutes media_routes(media_service_);
        Pistache::Rest::Routes::Group(router_, "/media", [&] (Pistache::Rest::Router& mediaRoutes) {
            // Upload, list, delete are protected
            mediaRoutes.addMiddleware(Pistache::Rest::Routes::bind(&AuthMiddleware::handle, &auth_middleware));
            media_routes.setup_protected_routes(mediaRoutes);
        });
        // Serving media is public
        Pistache::Rest::Routes::Get(router_, "/media/uploads/:filename", Pistache::Rest::Routes::bind(&MediaRoutes::serve_media_file, media_service_));


        // Serve static frontend files
        // This should be at the end to not override API routes
        Pistache::Rest::Routes::Get(router_, "/", Pistache::Rest::Routes::bind(&ApiRouter::serve_static_file, this, "index.html"));
        Pistache::Rest::Routes::Get(router_, "/:filename", Pistache::Rest::Routes::bind(&ApiRouter::serve_static_file, this, ":filename"));


        // Fallback for unmatched routes
        router_.addCustomHandler(Pistache::Rest::Routes::bind(&ApiRouter::not_found_handler, this));

        // Global Error Handler for uncaught exceptions within route handlers
        router_.onException = handle_error;
    }

    void health_check(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter response) {
        response.send(Pistache::Http::Code::Ok, "Service is healthy!\n");
    }

    void not_found_handler(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter response) {
        throw cms::common::NotFoundException("Route not found.");
    }

    void serve_static_file(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter response, std::string filename) {
        // Prevent directory traversal attacks
        if (filename.find("..") != std::string::npos) {
            throw cms::common::BadRequestException("Invalid file path.");
        }

        fs::path frontend_path = fs::path(fs::current_path()) / "src" / "frontend";
        
        // In Docker, the frontend files are copied to /usr/local/share/cms_app/frontend
        if (fs::exists("/usr/local/share/cms_app/frontend")) {
            frontend_path = "/usr/local/share/cms_app/frontend";
        }

        fs::path full_path = frontend_path / filename;

        // If the request is for "/" and filename is default, serve index.html
        if (filename == "/") {
            full_path = frontend_path / "index.html";
        }

        if (!fs::exists(full_path) || !fs::is_regular_file(full_path)) {
            LOG_WARN("Static file not found: {}", full_path.string());
            throw cms::common::NotFoundException("Static file not found.");
        }

        // Determine MIME type
        std::string mime_type = "application/octet-stream"; // Default
        if (full_path.extension() == ".html") mime_type = "text/html";
        else if (full_path.extension() == ".css") mime_type = "text/css";
        else if (full_path.extension() == ".js") mime_type = "application/javascript";
        else if (full_path.extension() == ".json") mime_type = "application/json";
        else if (full_path.extension() == ".png") mime_type = "image/png";
        else if (full_path.extension() == ".jpg" || full_path.extension() == ".jpeg") mime_type = "image/jpeg";
        else if (full_path.extension() == ".gif") mime_type = "image/gif";
        else if (full_path.extension() == ".ico") mime_type = "image/x-icon";

        // Serve the file
        LOG_DEBUG("Serving static file: {} with MIME type: {}", full_path.string(), mime_type);
        response.headers().add<Pistache::Http::Header::ContentType>(mime_type);
        Pistache::Http::serveFile(response, full_path.string());
    }
};

} // namespace cms::api

#endif // CMS_API_ROUTER_HPP
```