#ifndef CMS_MEDIA_ROUTES_HPP
#define CMS_MEDIA_ROUTES_HPP

#include <pistache/router.h>
#include <pistache/http.h>
#include <pistache/cookie.h>
#include <pistache/endpoint.h> // For Http::serveFile
#include <nlohmann/json.hpp>
#include <memory>
#include <fstream>
#include "../services/media_service.hpp"
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "auth_middleware.hpp" // For AuthContext

namespace cms::api {

using json = nlohmann::json;

class MediaRoutes {
public:
    explicit MediaRoutes(std::shared_ptr<cms::services::MediaService> media_service)
        : media_service_(std::move(media_service)) {
        if (!media_service_) {
            throw std::runtime_error("MediaRoutes requires a valid MediaService.");
        }
    }

    // Routes that require authentication
    void setup_protected_routes(Pistache::Rest::Router& router) {
        // POST /media - Upload a new media file (Editor/Admin only)
        Pistache::Rest::Routes::Post(router, "/", Pistache::Rest::Routes::bind(&MediaRoutes::upload_media, this));
        // GET /media - Get all media files
        Pistache::Rest::Routes::Get(router, "/", Pistache::Rest::Routes::bind(&MediaRoutes::get_all_media, this));
        // GET /media/:id - Get media file details by ID
        Pistache::Rest::Routes::Get(router, "/:id", Pistache::Rest::Routes::bind(&MediaRoutes::get_media_by_id, this));
        // DELETE /media/:id - Delete media file by ID (Author/Admin only)
        Pistache::Rest::Routes::Delete(router, "/:id", Pistache::Rest::Routes::bind(&MediaRoutes::delete_media, this));
    }

    // Route for serving media files (publicly accessible)
    // This is a static method as it's directly bound to the main router for efficiency,
    // and doesn't require `this` pointer or class state specific to protected routes.
    // It's part of the MediaRoutes class for logical grouping.
    static void serve_media_file(std::shared_ptr<cms::services::MediaService> service, const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /media/uploads/:filename GET request.");
        try {
            std::string filename = request.param(":filename").as<std::string>();

            // Prevent directory traversal attacks
            if (filename.find("..") != std::string::npos || filename.find("/") != std::string::npos) {
                throw cms::common::BadRequestException("Invalid file path.");
            }

            std::optional<std::filesystem::path> full_path = service->get_full_filepath(filename);
            if (full_path) {
                // Try to determine MIME type based on extension
                std::string mime_type = "application/octet-stream";
                if (full_path->extension() == ".jpg" || full_path->extension() == ".jpeg") mime_type = "image/jpeg";
                else if (full_path->extension() == ".png") mime_type = "image/png";
                else if (full_path->extension() == ".gif") mime_type = "image/gif";
                else if (full_path->extension() == ".svg") mime_type = "image/svg+xml";
                else if (full_path->extension() == ".pdf") mime_type = "application/pdf";
                else if (full_path->extension() == ".mp4") mime_type = "video/mp4";
                // Add more as needed

                response.headers().add<Pistache::Http::Header::ContentType>(mime_type);
                Pistache::Http::serveFile(response, full_path->string());
            } else {
                throw cms::common::NotFoundException("Media file not found.");
            }
        } catch (const cms::common::BadRequestException& e) {
            response.send(e.http_code(), nlohmann::json({{"error", e.what()}}).dump(), MIME(Application, Json));
        } catch (const cms::common::NotFoundException& e) {
            response.send(e.http_code(), nlohmann::json({{"error", e.what()}}).dump(), MIME(Application, Json));
        } catch (const std::exception& e) {
            LOG_ERROR("Error serving media file: {}", e.what());
            response.send(Pistache::Http::Code::Internal_Server_Error, nlohmann::json({{"error", "Failed to serve media file."}}).dump(), MIME(Application, Json));
        }
    }

private:
    std::shared_ptr<cms::services::MediaService> media_service_;

    void upload_media(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /media POST (upload) request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            
            // This expects a simple binary file upload or base64 encoded string in JSON.
            // For robust multipart form data, Pistache provides specific handlers.
            // For simplicity, we'll expect a JSON body with base64 encoded file data and metadata.
            json req_body = json::parse(request.body());

            std::string filename = common::get_json_string_required(req_body, "filename");
            std::string mimetype = common::get_json_string_required(req_body, "mimetype");
            std::string base64_content = common::get_json_string_required(req_body, "content"); // Base64 encoded

            // Decode base64 content (simplistic decode, real one needs a proper library)
            // For demonstration, we'll assume content is plain string or binary data directly for now
            // and skip actual base64 decoding for brevity, but note it's needed for real implementation.
            // A simple placeholder:
            std::string file_content_raw = base64_content; // In reality, this would be base64_decode(base64_content);
            
            cms::models::MediaFile uploaded_media = media_service_->upload_file(filename, mimetype, file_content_raw, auth_req.auth_context);

            response.send(Pistache::Http::Code::Created, uploaded_media.to_json().dump(), MIME(Application, Json));
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::BadRequestException& e) {
            throw;
        } catch (const json::exception& e) {
            throw cms::common::BadRequestException("Invalid JSON payload for media upload: " + std::string(e.what()));
        } catch (const std::exception& e) {
            LOG_ERROR("Error in upload_media: {}", e.what());
            throw cms::common::InternalServerError("Failed to upload media file.");
        }
    }

    void get_all_media(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /media GET request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            // Permissions for viewing all media can be restricted, e.g., only Editors/Admins.
            // For now, any authenticated user can list media.
            // But if user specific media is needed, it must be implemented here.
            
            int limit = request.query().has("limit") ? std::stoi(request.query().get("limit").get()) : 10;
            int offset = request.query().has("offset") ? std::stoi(request.query().get("offset").get()) : 0;

            std::vector<cms::models::MediaFile> media_list = media_service_->get_all_media(limit, offset);
            
            json res_array = json::array();
            for (const auto& media : media_list) {
                res_array.push_back(media.to_json());
            }

            response.send(Pistache::Http::Code::Ok, res_array.dump(), MIME(Application, Json));
        } catch (const std::exception& e) {
            LOG_ERROR("Error in get_all_media: {}", e.what());
            throw cms::common::InternalServerError("Failed to retrieve media files.");
        }
    }

    void get_media_by_id(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /media/:id GET request.");
        try {
            std::string media_id = request.param(":id").as<std::string>();
            // No explicit permission check here, assuming media metadata is viewable by authenticated users.
            // Actual file serving is done via `/media/uploads/:filename`.

            std::optional<cms::models::MediaFile> media = media_service_->get_media_by_id(media_id);
            if (media) {
                response.send(Pistache::Http::Code::Ok, media->to_json().dump(), MIME(Application, Json));
            } else {
                throw cms::common::NotFoundException("Media file metadata not found.");
            }
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in get_media_by_id: {}", e.what());
            throw cms::common::InternalServerError("Failed to retrieve media file metadata.");
        }
    }

    void delete_media(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        LOG_DEBUG("Handling /media/:id DELETE request.");
        try {
            const auto& auth_req = as_authenticated_request(request);
            std::string media_id = request.param(":id").as<std::string>();

            bool deleted = media_service_->delete_media(media_id, auth_req.auth_context);
            if (deleted) {
                response.send(Pistache::Http::Code::No_Content);
            } else {
                throw cms::common::NotFoundException("Media file not found.");
            }
        } catch (const cms::common::ForbiddenException& e) {
            throw;
        } catch (const cms::common::NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in delete_media: {}", e.what());
            throw cms::common::InternalServerError("Failed to delete media file.");
        }
    }
};

} // namespace cms::api

#endif // CMS_MEDIA_ROUTES_HPP
```