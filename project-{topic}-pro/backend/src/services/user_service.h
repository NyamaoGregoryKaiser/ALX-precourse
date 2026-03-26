#pragma once
#include "../models/user.h"
#include "../repositories/user_repository.h"
#include <string>
#include <optional>
#include <vector>
#include <functional> // For std::hash

// Password hashing utility (replace with a proper library like Argon2, bcrypt)
namespace PasswordHasher {
    std::string hash_password(const std::string& password);
    bool verify_password(const std::string& password, const std::string& hashed_password);
}

class UserService {
public:
    UserService(UserRepository& repo) : user_repository(repo) {}

    std::optional<UserResponseDTO> register_user(const UserCreateDTO& create_dto);
    std::optional<UserResponseDTO> get_user_by_id(long long id);
    std::optional<UserResponseDTO> get_user_by_email(const std::string& email); // For internal use, e.g., login
    std::vector<UserResponseDTO> get_all_users(int limit, int offset);
    std::optional<UserResponseDTO> update_user(long long id, const UserUpdateDTO& update_dto, UserRole requesting_user_role);
    bool delete_user(long long id, UserRole requesting_user_role);

    // Authentication specific
    std::optional<User> validate_credentials(const std::string& email, const std::string& password);

private:
    UserRepository& user_repository;

    // Helper for authorization
    bool is_admin(UserRole role) const { return role == UserRole::ADMIN; }
    bool is_owner_or_admin(long long target_user_id, long long requesting_user_id, UserRole requesting_user_role) const {
        return requesting_user_id == target_user_id || is_admin(requesting_user_role);
    }
};