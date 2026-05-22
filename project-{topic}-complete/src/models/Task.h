```cpp
#pragma once

#include <string>
#include <json/json.h>
#include <optional>
#include <vector>

struct Task {
    long id = 0;
    long userId = 0;
    std::string title;
    std::optional<std::string> description;
    std::string status = "TODO"; // ENUM: TODO, IN_PROGRESS, DONE
    std::optional<std::string> dueDate; // ISO 8601 format
    std::string createdAt;
    std::string updatedAt;

    // Convert Task struct to Json::Value for API responses
    Json::Value toJson() const {
        Json::Value root;
        root["id"] = id;
        root["user_id"] = userId;
        root["title"] = title;
        if (description.has_value()) root["description"] = description.value();
        root["status"] = status;
        if (dueDate.has_value()) root["due_date"] = dueDate.value();
        root["created_at"] = createdAt;
        root["updated_at"] = updatedAt;
        return root;
    }

    // Populate Task struct from Json::Value (e.g., for creation/update input)
    static Task fromJson(const Json::Value& json) {
        Task task;
        if (json.isMember("id") && json["id"].isNumeric()) task.id = json["id"].asInt64();
        if (json.isMember("user_id") && json["user_id"].isNumeric()) task.userId = json["user_id"].asInt64(); // Often set by auth, not input
        if (json.isMember("title") && json["title"].isString()) task.title = json["title"].asString();
        if (json.isMember("description") && !json["description"].isNull() && json["description"].isString()) task.description = json["description"].asString();
        if (json.isMember("status") && json["status"].isString()) task.status = json["status"].asString();
        if (json.isMember("due_date") && !json["due_date"].isNull() && json["due_date"].isString()) task.dueDate = json["due_date"].asString();
        // created_at/updated_at are typically set by DB or service
        return task;
    }
};
```