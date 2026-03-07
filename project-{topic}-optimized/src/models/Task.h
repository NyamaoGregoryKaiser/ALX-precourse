```cpp
#pragma once

#include <string>
#include <json/json.h>
#include <drogon/orm/Mapper.h>
#include <drogon/orm/Result.h>

class Task {
public:
    enum Status {
        TODO,
        IN_PROGRESS,
        DONE
    };

    int id = 0;
    std::string title;
    std::string description;
    Status status = TODO;
    int user_id = 0; // Owner of the task
    int category_id = 0; // Optional category
    std::string due_date; // YYYY-MM-DD format
    std::string created_at;
    std::string updated_at;

    Json::Value toJson() const {
        Json::Value taskJson;
        taskJson["id"] = id;
        taskJson["title"] = title;
        taskJson["description"] = description;
        taskJson["status"] = statusToString(status);
        taskJson["user_id"] = user_id;
        taskJson["category_id"] = category_id;
        taskJson["due_date"] = due_date;
        taskJson["created_at"] = created_at;
        taskJson["updated_at"] = updated_at;
        return taskJson;
    }

    static std::string statusToString(Status s) {
        switch (s) {
            case TODO: return "TODO";
            case IN_PROGRESS: return "IN_PROGRESS";
            case DONE: return "DONE";
        }
        return "UNKNOWN";
    }

    static Status stringToStatus(const std::string& s) {
        if (s == "IN_PROGRESS") return IN_PROGRESS;
        if (s == "DONE") return DONE;
        return TODO; // Default
    }

    static Task fromDbResult(const drogon::orm::Result& result, int rowIdx) {
        Task task;
        task.id = result[rowIdx]["id"].as<int>();
        task.title = result[rowIdx]["title"].as<std::string>();
        task.description = result[rowIdx]["description"].as<std::string>();
        task.status = stringToStatus(result[rowIdx]["status"].as<std::string>());
        task.user_id = result[rowIdx]["user_id"].as<int>();
        // Category_id can be null in DB, handle appropriately
        if (!result[rowIdx]["category_id"].isNull()) {
             task.category_id = result[rowIdx]["category_id"].as<int>();
        } else {
            task.category_id = 0; // Indicate no category or handle as std::optional
        }
        task.due_date = result[rowIdx]["due_date"].as<std::string>();
        task.created_at = result[rowIdx]["created_at"].as<std::string>();
        task.updated_at = result[rowIdx]["updated_at"].as<std::string>();
        return task;
    }
};

namespace drogon::orm {
    template<>
    struct FieldMapper<Task> {
        static constexpr const char* tableName = "tasks";
        static constexpr const char* primaryKeyName = "id";
        static constexpr bool isAutoCreatedPrimaryKey = true;

        static std::map<std::string, std::string> getColumnMap() {
            return {
                {"id", "id"},
                {"title", "title"},
                {"description", "description"},
                {"status", "status"},
                {"user_id", "user_id"},
                {"category_id", "category_id"},
                {"due_date", "due_date"},
                {"created_at", "created_at"},
                {"updated_at", "updated_at"}
            };
        }
    };
}
```