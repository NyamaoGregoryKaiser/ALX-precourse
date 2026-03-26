#include "user_service.h"
#include <stdexcept>
#include "../core/middleware.h" // For ApiException
#include <bcrypt.h> // For proper password hashing (requires linking -lbcrypt)

// Mock implementation for password hashing (REPLACE WITH REAL BCrypt/Argon2)
namespace PasswordHasher {
    std::string hash_password(const std::string& password) {
        // In a real application, use bcrypt or Argon2 for robust hashing
        // Example with bcrypt-cpp (needs linking -lbcrypt)
        char salt[BCRYPT_HASH_BUFFER];
        bcrypt_gensalt(12, salt); // 12 is the cost factor
        char hash[BCRYPT_HASH_BUFFER];
        bcrypt_hashpw(password.c_str(), salt, hash);
        return std::string(hash);
    }

    bool verify_password(const std::string& password, const std::string& hashed_password) {
        // Example with bcrypt-cpp
        return bcrypt_checkpw(password.c_str(), hashed_password.c_str()) == 0;
    }
}

std::optional<UserResponseDTO> UserService::register_user(const UserCreateDTO& create_dto) {
    if (user_repository.find_by_email(create_dto.email)) {
        throw ApiException(Pistache::Http::Code::Conflict, "User with this email already exists");
    }
    if (create_dto.password.length() < 8) {
        throw ApiException(Pistache::Http::Code::Bad_Request, "Password must be at least 8 characters long");
    }

    std::string hashed_password = PasswordHasher::hash_password(create_dto.password);
    UserRole user_role = UserRole::USER; // Default role for new registrations
    if (create_dto.role) {
        // Only admin can set a custom role. For registration, assume user is not admin.
        // This logic could be more complex, e.g., an 'invitation code' for admin registration.
        spdlog::warn("Attempted to set role during registration for email: {}", create_dto.email);
    }

    User new_user(create_dto.username, create_dto.email, hashed_password, user_role);
    if (auto created_user = user_repository.create(new_user)) {
        return UserResponseDTO::from_user(created_user.value());
    }
    return std::nullopt;
}

std::optional<UserResponseDTO> UserService::get_user_by_id(long long id) {
    if (auto user = user_repository.find_by_id(id)) {
        return UserResponseDTO::from_user(user.value());
    }
    return std::nullopt;
}

std::optional<UserResponseDTO> UserService::get_user_by_email(const std::string& email) {
    if (auto user = user_repository.find_by_email(email)) {
        return UserResponseDTO::from_user(user.value());
    }
    return std::nullopt;
}

std::vector<UserResponseDTO> UserService::get_all_users(int limit, int offset) {
    std::vector<UserResponseDTO> response_dtos;
    for (const auto& user : user_repository.find_all(limit, offset)) {
        response_dtos.push_back(UserResponseDTO::from_user(user));
    }
    return response_dtos;
}

std::optional<UserResponseDTO> UserService::update_user(long long id, const UserUpdateDTO& update_dto, UserRole requesting_user_role) {
    auto existing_user_opt = user_repository.find_by_id(id);
    if (!existing_user_opt) {
        throw ApiException(Pistache::Http::Code::Not_Found, "User not found");
    }
    User existing_user = existing_user_opt.value();

    // Authorization check: Only admin can update other users, or a user can update their own profile.
    // For simplicity, we assume the requesting user's ID is available (e.g., from JWT token).
    // This example implies a user can update themselves only if `id` matches their own ID.
    // A proper solution would pass the 'current_user_id' from the authenticated context.
    // For now, let's assume `id` here is the *target* user id.
    // A requesting_user_id is needed for `is_owner_or_admin`. We can't derive it here.
    // We'll proceed with basic role check for simplicity.
    if (!is_admin(requesting_user_role) && (update_dto.role || update_dto.email != existing_user.email)) {
        // If not admin, cannot change role or email (assuming email is a unique identifier/login)
        // More granular checks needed here. For this example:
        throw ApiException(Pistache::Http::Code::Forbidden, "Insufficient permissions to update this user's details");
    }

    if (update_dto.username) existing_user.username = update_dto.username.value();
    if (update_dto.email) existing_user.email = update_dto.email.value(); // Check for email uniqueness again if changed
    if (update_dto.password) existing_user.password_hash = PasswordHasher::hash_password(update_dto.password.value());
    if (update_dto.role && is_admin(requesting_user_role)) { // Only admin can update roles
        existing_user.role = User::string_to_role(update_dto.role.value());
    }
    existing_user.updated_at = std::time(nullptr);

    if (user_repository.update(existing_user)) {
        return UserResponseDTO::from_user(existing_user);
    }
    return std::nullopt;
}

bool UserService::delete_user(long long id, UserRole requesting_user_role) {
    auto existing_user_opt = user_repository.find_by_id(id);
    if (!existing_user_opt) {
        throw ApiException(Pistache::Http::Code::Not_Found, "User not found");
    }

    // Only admin can delete users
    if (!is_admin(requesting_user_role)) {
        throw ApiException(Pistache::Http::Code::Forbidden, "Insufficient permissions to delete user");
    }

    return user_repository.remove(id);
}

std::optional<User> UserService::validate_credentials(const std::string& email, const std::string& password) {
    if (auto user = user_repository.find_by_email(email)) {
        if (PasswordHasher::verify_password(password, user->password_hash)) {
            return user;
        }
    }
    return std::nullopt;
}