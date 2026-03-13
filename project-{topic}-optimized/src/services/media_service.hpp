#ifndef CMS_MEDIA_SERVICE_HPP
#define CMS_MEDIA_SERVICE_HPP

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include <fstream>
#include <filesystem> // C++17 filesystem
#include "../database/media_repository.hpp"
#include "../models/media.hpp"
#include "../auth/auth_middleware.hpp" // For AuthContext
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "../common/uuid.hpp"

namespace cms::services {

namespace fs = std::filesystem;

class MediaService {
public:
    MediaService(std::shared_ptr<cms::database::MediaRepository> media_repo,
                 const std::string& upload_dir = "uploads")
        : media_repo_(std::move(media_repo)), upload_directory_(upload_dir) {
        if (!media_repo_) {
            throw std::runtime_error("MediaService requires a valid MediaRepository.");
        }
        // Create upload directory if it doesn't exist
        if (!fs::exists(upload_directory_)) {
            if (!fs::create_directories(upload_directory_)) {
                LOG_CRITICAL("Failed to create upload directory: {}", upload_directory_);
                throw std::runtime_error("Failed to initialize MediaService: Could not create upload directory.");
            }
        }
        LOG_INFO("Media upload directory set to: {}", upload_directory_);
    }

    // Upload a new media file
    cms::models::MediaFile upload_file(const std::string& filename, const std::string& mimetype,
                                       const std::string& file_content_raw, const cms::api::AuthContext& auth_context) {
        if (!auth_context.has_role(cms::models::UserRole::EDITOR)) {
            throw cms::common::ForbiddenException("Only editors or admins can upload media.");
        }
        if (filename.empty() || mimetype.empty() || file_content_raw.empty()) {
            throw cms::common::BadRequestException("Filename, mimetype, and file content cannot be empty.");
        }
        
        // Generate a unique filename to prevent conflicts
        std::string unique_filename = cms::common::UUID::generate_v4() + "_" + filename;
        fs::path file_path = fs::path(upload_directory_) / unique_filename;
        std::string relative_filepath = (fs::path("uploads") / unique_filename).string(); // For DB storage

        // Save file to disk
        std::ofstream outfile(file_path, std::ios::binary);
        if (!outfile) {
            LOG_ERROR("Failed to open file for writing: {}", file_path.string());
            throw cms::common::InternalServerError("Failed to save media file.");
        }
        outfile.write(file_content_raw.data(), file_content_raw.size());
        outfile.close();

        if (!outfile.good()) {
            LOG_ERROR("Error writing file content to: {}", file_path.string());
            throw cms::common::InternalServerError("Error writing media file content.");
        }

        // Create database entry
        cms::models::MediaFile new_media;
        new_media.filename = filename;
        new_media.filepath = relative_filepath;
        new_media.mimetype = mimetype;
        new_media.filesize_bytes = file_content_raw.size();
        new_media.uploaded_by = auth_context.user_id;

        try {
            cms::models::MediaFile created_media = media_repo_->create(new_media);
            LOG_INFO("Media file uploaded: {} ({}) by user {}", created_media.filename, created_media.id, auth_context.username);
            return created_media;
        } catch (const std::exception& e) {
            // If DB entry fails, try to clean up the uploaded file
            fs::remove(file_path);
            LOG_ERROR("Error creating media DB entry, rolling back file: {}", e.what());
            throw cms::common::InternalServerError("Failed to record media file in database.");
        }
    }

    // Get media file details by ID
    std::optional<cms::models::MediaFile> get_media_by_id(const std::string& id) {
        LOG_DEBUG("Fetching media by ID: {}", id);
        return media_repo_->find_by_id(id);
    }

    // Get all media files
    std::vector<cms::models::MediaFile> get_all_media(int limit, int offset) {
        LOG_DEBUG("Fetching all media files (limit={}, offset={})", limit, offset);
        return media_repo_->find_all(limit, offset);
    }

    // Delete media file
    bool delete_media(const std::string& id, const cms::api::AuthContext& auth_context) {
        std::optional<cms::models::MediaFile> existing_media = media_repo_->find_by_id(id);
        if (!existing_media) {
            LOG_WARN("Attempt to delete non-existent media with ID: {}", id);
            return false;
        }

        // Authorization: Admin can delete anything. Editor can delete their own uploaded files.
        if (auth_context.user_id != existing_media->uploaded_by && !auth_context.has_role(cms::models::UserRole::ADMIN)) {
            throw cms::common::ForbiddenException("You are not authorized to delete this media file.");
        }

        try {
            // Delete from database first
            bool db_deleted = media_repo_->remove(id);
            if (db_deleted) {
                // Then delete the physical file
                fs::path file_to_delete = fs::path(upload_directory_) / fs::path(existing_media->filepath).filename();
                if (fs::exists(file_to_delete)) {
                    fs::remove(file_to_delete);
                    LOG_INFO("Physical media file deleted: {}", file_to_delete.string());
                } else {
                    LOG_WARN("Physical media file not found on disk, but DB entry was removed: {}", file_to_delete.string());
                }
                LOG_INFO("Media file {} deleted by user {}", id, auth_context.username);
            }
            return db_deleted;
        } catch (const std::exception& e) {
            LOG_ERROR("Error deleting media file {}: {}", id, e.what());
            throw cms::common::InternalServerError("Failed to delete media file.");
        }
    }

    // Get the full path for serving a media file
    std::optional<fs::path> get_full_filepath(const std::string& filename) {
        fs::path full_path = fs::path(upload_directory_) / filename;
        if (fs::exists(full_path) && fs::is_regular_file(full_path)) {
            return full_path;
        }
        return std::nullopt;
    }


private:
    std::shared_ptr<cms::database::MediaRepository> media_repo_;
    std::string upload_directory_;
};

} // namespace cms::services

#endif // CMS_MEDIA_SERVICE_HPP
```