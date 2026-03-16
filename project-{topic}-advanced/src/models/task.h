```cpp
#ifndef MOBILE_BACKEND_TASK_H
#define MOBILE_BACKEND_TASK_H

#include <string>
#include <crow/json.h>

namespace mobile_backend {
namespace models {

struct Task {
    int id = 0;
    int user_id = 0;
    std::string title;
    std::string description;
    bool completed = false;
    std::string created_at;
    std::string updated_at;

    // Convert Task object to Crow JSON object
    crow::json::wvalue to_json() const {
        crow::json::wvalue json_task;
        json_task["id"] = id;
        json_task["user_id"] = user_id;
        json_task["title"] = title;
        json_task["description"] = description;
        json_task["completed"] = completed;
        json_task["created_at"] = created_at;
        json_task["updated_at"] = updated_at;
        return json_task;
    }
};

} // namespace models
} // namespace mobile_backend

#endif // MOBILE_BACKEND_TASK_H
```