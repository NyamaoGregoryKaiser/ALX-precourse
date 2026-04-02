```cpp
#ifndef BASE_MODELS_H
#define BASE_MODELS_H

#include <string>
#include <vector>
#include <map>
#include <json/json.hpp>
#include <optional>

namespace TaskManager {
namespace Models {

enum class UserRole {
    USER,
    ADMIN,
    UNKNOWN
};

inline std::string userRoleToString(UserRole role) {
    switch (role) {
        case UserRole::USER: return "user";
        case UserRole::ADMIN: return "admin";
        default: return "unknown";
    }
}

inline UserRole stringToUserRole(const std::string& role_str) {
    if (role_str == "user") return UserRole::USER;
    if (role_str == "admin") return UserRole::ADMIN;
    return UserRole::UNKNOWN;
}

enum class TaskStatus {
    TODO,
    IN_PROGRESS,
    DONE,
    CANCELLED,
    UNKNOWN
};

inline std::string taskStatusToString(TaskStatus status) {
    switch (status) {
        case TaskStatus::TODO: return "TODO";
        case TaskStatus::IN_PROGRESS: return "IN_PROGRESS";
        case TaskStatus::DONE: return "DONE";
        case TaskStatus::CANCELLED: return "CANCELLED";
        default: return "UNKNOWN";
    }
}

inline TaskStatus stringToTaskStatus(const std::string& status_str) {
    if (status_str == "TODO") return TaskStatus::TODO;
    if (status_str == "IN_PROGRESS") return TaskStatus::IN_PROGRESS;
    if (status_str == "DONE") return TaskStatus::DONE;
    if (status_str == "CANCELLED") return TaskStatus::CANCELLED;
    return TaskStatus::UNKNOWN;
}

enum class TaskPriority {
    LOW,
    MEDIUM,
    HIGH,
    UNKNOWN
};

inline std::string taskPriorityToString(TaskPriority priority) {
    switch (priority) {
        case TaskPriority::LOW: return "LOW";
        case TaskPriority::MEDIUM: return "MEDIUM";
        case TaskPriority::HIGH: return "HIGH";
        default: return "UNKNOWN";
    }
}

inline TaskPriority stringToTaskPriority(const std::string& priority_str) {
    if (priority_str == "LOW") return TaskPriority::LOW;
    if (priority_str == "MEDIUM") return TaskPriority::MEDIUM;
    if (priority_str == "HIGH") return TaskPriority::HIGH;
    return TaskPriority::UNKNOWN;
}

} // namespace Models
} // namespace TaskManager

#endif // BASE_MODELS_H
```