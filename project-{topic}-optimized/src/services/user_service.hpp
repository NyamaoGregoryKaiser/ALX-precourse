#ifndef CMS_USER_SERVICE_HPP
#define CMS_USER_SERVICE_HPP

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include <bcrypt.h> // For password hashing
#include "../database/user_repository.hpp"
#include "../models/user.hpp"
#include "../auth/auth_middleware.hpp" // For AuthContext
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "../cache/lru_cache.hpp"

namespace cms::services {

class UserService {
public:
    UserService(std::shared_ptr<cms::database::UserRepository> user_repo,
                std::shared_ptr<cms::cache::LRUCache<std::string, cms::models::User>> user_cache)
        : user_repo_(std::move(user_repo)), user_cache_(std::move(user_cache)) {
        if (!user_repo_ || !user_cache_) {
            throw std::runtime_error("UserService requires valid UserRepository and LRUCache.");
        }
    }

    // Get user by ID
    std::optional<cms::models::User> get_user_by_id(const std::string& id) {
        // Try to get from cache first
        if (auto cached_user = user_cache_->get(id)) {
            LOG_DEBUG("User {} found in cache.", id);
            return cached_user;
        }

        LOG_DEBUG("User {} not in cache, fetching from DB.", id);
        std::optional<cms::models::User> user = user_repo_->find_by_id(id);
        if (user) {
            user_cache_->put(id, *user); // Cache if found in DB
        } else {
            LOG_WARN("User with ID {} not found.", id);
        }
        return user;
    }

    // Get all users (admin-only)
    std::vector<cms::models::User> get_all_users(int limit, int offset, const cms::api::AuthContext& auth_context) {
        if (!auth_context.has_role(cms::models::UserRole::ADMIN)) {
            throw cms::common::ForbiddenException("Only admins can view all users.");
        }
        LOG_DEBUG("Fetching all users (limit={}, offset={}) by admin {}.", limit, offset, auth_context.username);
        return user_repo_->find_all(limit, offset);
    }

    // Update user (admin can update anyone, editor/viewer can only update themselves)
    std::optional<cms::models::User> update_user(const std::string& id, const cms::models::User::UpdateFields& updates, const cms::api::AuthContext& auth_context) {
        // Authorization: User can only update their own profile unless they are an admin.
        // Admins can update any user, including role.
        if (id != auth_context.user_id && !auth_context.has_role(cms::models::UserRole::ADMIN)) {
            throw cms::common::ForbiddenException("You are not authorized to update this user's profile.");
        }

        // If a non-admin user tries to change their role, deny it.
        if (updates.role.has_value() && !auth_context.has_role(cms::models::UserRole::ADMIN)) {
            throw cms::common::ForbiddenException("You are not authorized to change user roles.");
        }

        // Hash password if provided
        cms::models::User::UpdateFields fields_to_update = updates;
        if (fields_to_update.password) {
            if (fields_to_update.password->length() < 8) {
                throw cms::common::BadRequestException("Password must be at least 8 characters long.");
            }
            fields_to_update.password = hash_password(*fields_to_update.password);
        }

        try {
            std::optional<cms::models::User> updated_user = user_repo_->update(id, fields_to_update);
            if (updated_user) {
                user_cache_->put(id, *updated_user); // Update cache
                LOG_INFO("User {} updated by {}.", id, auth_context.username);
            }
            return updated_user;
        } catch (const cms::common::ConflictException& e) {
            LOG_WARN("User update conflict: {}", e.what());
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error updating user {}: {}", id, e.what());
            throw cms::common::InternalServerError("Failed to update user.");
        }
    }

    // Delete user (admin-only)
    bool delete_user(const std::string& id, const cms::api::AuthContext& auth_context) {
        if (!auth_context.has_role(cms::models::UserRole::ADMIN)) {
            throw cms::common::ForbiddenException("Only admins can delete users.");
        }
        // Prevent admin from deleting themselves
        if (id == auth_context.user_id) {
            throw cms::common::BadRequestException("An admin cannot delete their own account.");
        }

        try {
            bool success = user_repo_->remove(id);
            if (success) {
                user_cache_->remove(id); // Remove from cache
                LOG_INFO("User {} deleted by admin {}.", id, auth_context.username);
            } else {
                LOG_WARN("Attempt to delete non-existent user with ID: {}.", id);
            }
            return success;
        } catch (const std::exception& e) {
            LOG_ERROR("Error deleting user {}: {}", id, e.what());
            throw cms::common::InternalServerError("Failed to delete user.");
        }
    }

private:
    std::shared_ptr<cms::database::UserRepository> user_repo_;
    std::shared_ptr<cms::cache::LRUCache<std::string, cms::models::User>> user_cache_;

    // Hash a password using bcrypt
    std::string hash_password(const std::string& password) {
        char salt[BCRYPT_HASH_BUFFER];
        char hash[BCRYPT_HASH_BUFFER];
        int ret = bcrypt_gensalt(10, salt); // 10 is the cost factor
        if (ret != 0) {
            LOG_CRITICAL("Failed to generate bcrypt salt.");
            throw std::runtime_error("Password hashing failed.");
        }
        ret = bcrypt_hashpw(password.c_str(), salt, hash);
        if (ret != 0) {
            LOG_CRITICAL("Failed to hash password with bcrypt.");
            throw std::runtime_error("Password hashing failed.");
        }
        return std::string(hash);
    }
};

} // namespace cms::services

#endif // CMS_USER_SERVICE_HPP
```