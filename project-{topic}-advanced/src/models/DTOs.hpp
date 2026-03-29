```cpp
#ifndef DTOS_HPP
#define DTOS_HPP

#include <string>
#include <optional>
#include "json.hpp"
#include "User.hpp"
#include "Project.hpp"
#include "Task.hpp"

// --- Request DTOs (Data Transfer Objects for incoming requests) ---

struct UserRegisterDTO {
    std::string username;
    std::string email;
    std::string password; // Raw password for registration

    static UserRegisterDTO fromJson(const nlohmann::json& j) {
        UserRegisterDTO dto;
        dto.username = j.at("username").get<std::string>();
        dto.email = j.at("email").get<std::string>();
        dto.password = j.at("password").get<std::string>();
        return dto;
    }
};

struct UserLoginDTO {
    std::string username;
    std::string password;

    static UserLoginDTO fromJson(const nlohmann::json& j) {
        UserLoginDTO dto;
        dto.username = j.at("username").get<std::string>();
        dto.password = j.at("password").get<std::string>();
        return dto;
    }
};

struct UserUpdateDTO {
    std::optional<std::string> username;
    std::optional<std::string> email;
    std::optional<std::string> password; // New password (will be hashed)
    std::optional<std::string> role;     // "USER" or "ADMIN"

    static UserUpdateDTO fromJson(const nlohmann::json& j) {
        UserUpdateDTO dto;
        if (j.contains("username")) dto.username = j.at("username").get<std::string>();
        if (j.contains("email")) dto.email = j.at("email").get<std::string>();
        if (j.contains("password")) dto.password = j.at("password").get<std::string>();
        if (j.contains("role")) dto.role = j.at("role").get<std::string>();
        return dto;
    }
};

struct ProjectCreateDTO {
    std::string name;
    std::string description;
    std::optional<int> owner_id;

    static ProjectCreateDTO fromJson(const nlohmann::json& j) {
        ProjectCreateDTO dto;
        dto.name = j.at("name").get<std::string>();
        dto.description = j.at("description").get<std::string>();
        if (j.contains("owner_id") && !j["owner_id"].is_null()) {
            dto.owner_id = j.at("owner_id").get<int>();
        }
        return dto;
    }
};

struct ProjectUpdateDTO {
    std::optional<std::string> name;
    std::optional<std::string> description;
    std::optional<int> owner_id; // Can be null to clear owner

    static ProjectUpdateDTO fromJson(const nlohmann::json& j) {
        ProjectUpdateDTO dto;
        if (j.contains("name")) dto.name = j.at("name").get<std::string>();
        if (j.contains("description")) dto.description = j.at("description").get<std::string>();
        if (j.contains("owner_id")) {
             if (j["owner_id"].is_null()) dto.owner_id = std::nullopt;
             else dto.owner_id = j.at("owner_id").get<int>();
        }
        return dto;
    }
};

struct TaskCreateDTO {
    std::string title;
    std::string description;
    std::optional<std::string> status; // "TODO", "IN_PROGRESS", "DONE"
    std::optional<int> assigned_user_id; // Can be null
    int project_id; // Required

    static TaskCreateDTO fromJson(const nlohmann::json& j) {
        TaskCreateDTO dto;
        dto.title = j.at("title").get<std::string>();
        dto.description = j.at("description").get<std::string>();
        if (j.contains("status")) dto.status = j.at("status").get<std::string>();
        if (j.contains("assigned_user_id") && !j["assigned_user_id"].is_null()) {
            dto.assigned_user_id = j.at("assigned_user_id").get<int>();
        }
        dto.project_id = j.at("project_id").get<int>();
        return dto;
    }
};

struct TaskUpdateDTO {
    std::optional<std::string> title;
    std::optional<std::string> description;
    std::optional<std::string> status; // "TODO", "IN_PROGRESS", "DONE"
    std::optional<int> assigned_user_id; // Can be null to clear assignment
    std::optional<int> project_id;

    static TaskUpdateDTO fromJson(const nlohmann::json& j) {
        TaskUpdateDTO dto;
        if (j.contains("title")) dto.title = j.at("title").get<std::string>();
        if (j.contains("description")) dto.description = j.at("description").get<std::string>();
        if (j.contains("status")) dto.status = j.at("status").get<std::string>();
        if (j.contains("assigned_user_id")) {
             if (j["assigned_user_id"].is_null()) dto.assigned_user_id = std::nullopt;
             else dto.assigned_user_id = j.at("assigned_user_id").get<int>();
        }
        if (j.contains("project_id")) dto.project_id = j.at("project_id").get<int>();
        return dto;
    }
};


// --- Response DTOs (Data Transfer Objects for outgoing responses) ---

struct AuthResponseDTO {
    std::string token;
    User user;

    nlohmann::json toJson() const {
        nlohmann::json j;
        j["token"] = token;
        j["user"] = user.toJson();
        return j;
    }
};

#endif // DTOS_HPP
```