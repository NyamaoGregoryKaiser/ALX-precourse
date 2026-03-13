#ifndef CMS_CONTENT_SERVICE_HPP
#define CMS_CONTENT_SERVICE_HPP

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include "../database/content_repository.hpp"
#include "../models/content.hpp"
#include "../models/user.hpp" // For UserRole
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "../cache/lru_cache.hpp"

namespace cms::services {

class ContentService {
public:
    ContentService(std::shared_ptr<cms::database::ContentRepository> content_repo,
                   std::shared_ptr<cms::cache::LRUCache<std::string, cms::models::Content>> content_cache)
        : content_repo_(std::move(content_repo)), content_cache_(std::move(content_cache)) {
        if (!content_repo_ || !content_cache_) {
            throw std::runtime_error("ContentService requires valid ContentRepository and LRUCache.");
        }
    }

    // Create new content
    cms::models::Content create_content(const cms::models::Content& new_content, const cms::api::AuthContext& auth_context) {
        if (!auth_context.has_role(cms::models::UserRole::EDITOR)) {
            throw cms::common::ForbiddenException("Only editors or admins can create content.");
        }
        
        try {
            // Ensure the author_id is set to the authenticated user's ID
            cms::models::Content content_to_create = new_content;
            content_to_create.author_id = auth_context.user_id;

            cms::models::Content created_content = content_repo_->create(content_to_create);
            content_cache_->put(created_content.id, created_content); // Cache the new content
            LOG_INFO("Content created: {} by user {}", created_content.title, auth_context.username);
            return created_content;
        } catch (const cms::common::ConflictException& e) {
            LOG_WARN("Content creation conflict: {}", e.what());
            throw; // Re-throw for API to handle
        } catch (const std::exception& e) {
            LOG_ERROR("Error creating content: {}", e.what());
            throw cms::common::InternalServerError("Failed to create content.");
        }
    }

    // Get content by ID
    std::optional<cms::models::Content> get_content_by_id(const std::string& id) {
        // Try to get from cache first
        if (auto cached_content = content_cache_->get(id)) {
            LOG_DEBUG("Content {} found in cache.", id);
            return cached_content;
        }

        LOG_DEBUG("Content {} not in cache, fetching from DB.", id);
        std::optional<cms::models::Content> content = content_repo_->find_by_id(id);
        if (content) {
            content_cache_->put(id, *content); // Cache if found in DB
        } else {
            LOG_WARN("Content with ID {} not found.", id);
        }
        return content;
    }
    
    // Get content by slug
    std::optional<cms::models::Content> get_content_by_slug(const std::string& slug) {
        // Caching by slug would require a separate slug-to-ID mapping in cache or caching the whole content object by slug.
        // For simplicity, we fetch directly from DB for slug for now. A more advanced cache would handle this.
        LOG_DEBUG("Fetching content by slug: {}", slug);
        std::optional<cms::models::Content> content = content_repo_->find_by_slug(slug);
        if (content) {
            content_cache_->put(content->id, *content); // Cache by ID if found
        } else {
            LOG_WARN("Content with slug {} not found.", slug);
        }
        return content;
    }


    // Get all content (with pagination and optional status filter)
    std::vector<cms::models::Content> get_all_content(int limit, int offset, const std::string& status_filter, const cms::api::AuthContext& auth_context) {
        // Only admins/editors can view drafts/archived content
        if ((status_filter == "draft" || status_filter == "archived") && !auth_context.has_role(cms::models::UserRole::EDITOR)) {
            throw cms::common::ForbiddenException("Unauthorized to view content with status: " + status_filter);
        }
        
        // If not admin/editor, and no specific status is requested, or requested status is "published", then retrieve only published content.
        // This ensures viewers only see published content unless explicitly requested by higher roles.
        std::string effective_status_filter = status_filter;
        if (!auth_context.has_role(cms::models::UserRole::EDITOR) && status_filter.empty()) {
             effective_status_filter = cms::models::content_status_to_string(cms::models::ContentStatus::PUBLISHED);
        }
        
        LOG_DEBUG("Fetching all content (limit={}, offset={}, status_filter={})", limit, offset, effective_status_filter);
        return content_repo_->find_all(limit, offset, effective_status_filter);
    }

    // Update content
    std::optional<cms::models::Content> update_content(const std::string& id, const cms::models::Content::UpdateFields& updates, const cms::api::AuthContext& auth_context) {
        std::optional<cms::models::Content> existing_content = content_repo_->find_by_id(id);
        if (!existing_content) {
            LOG_WARN("Attempt to update non-existent content with ID: {}", id);
            return std::nullopt; // Content not found
        }

        // Authorization: Admin can update anything. Editor can update their own content or if role changes to editor for content.
        if (auth_context.user_id != existing_content->author_id && !auth_context.has_role(cms::models::UserRole::ADMIN)) {
            throw cms::common::ForbiddenException("You are not authorized to update this content.");
        }
        // If an editor attempts to change the author_id or promote role without being an admin, deny.
        // This logic can be further refined based on specific business rules.

        try {
            std::optional<cms::models::Content> updated_content = content_repo_->update(id, updates);
            if (updated_content) {
                content_cache_->put(id, *updated_content); // Update cache
                LOG_INFO("Content {} updated by user {}", id, auth_context.username);
            }
            return updated_content;
        } catch (const cms::common::ConflictException& e) {
            LOG_WARN("Content update conflict: {}", e.what());
            throw; // Re-throw for API to handle
        } catch (const std::exception& e) {
            LOG_ERROR("Error updating content {}: {}", id, e.what());
            throw cms::common::InternalServerError("Failed to update content.");
        }
    }

    // Delete content
    bool delete_content(const std::string& id, const cms::api::AuthContext& auth_context) {
        std::optional<cms::models::Content> existing_content = content_repo_->find_by_id(id);
        if (!existing_content) {
            LOG_WARN("Attempt to delete non-existent content with ID: {}", id);
            return false;
        }

        // Authorization: Admin can delete anything. Editor can delete their own content.
        if (auth_context.user_id != existing_content->author_id && !auth_context.has_role(cms::models::UserRole::ADMIN)) {
            throw cms::common::ForbiddenException("You are not authorized to delete this content.");
        }

        try {
            bool success = content_repo_->remove(id);
            if (success) {
                content_cache_->remove(id); // Remove from cache
                LOG_INFO("Content {} deleted by user {}", id, auth_context.username);
            }
            return success;
        } catch (const std::exception& e) {
            LOG_ERROR("Error deleting content {}: {}", id, e.what());
            throw cms::common::InternalServerError("Failed to delete content.");
        }
    }

private:
    std::shared_ptr<cms::database::ContentRepository> content_repo_;
    std::shared_ptr<cms::cache::LRUCache<std::string, cms::models::Content>> content_cache_;
};

} // namespace cms::services

#endif // CMS_CONTENT_SERVICE_HPP
```