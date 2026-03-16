```cpp
#ifndef MOBILE_BACKEND_TASK_SERVICE_H
#define MOBILE_BACKEND_TASK_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include <stdexcept>
#include "../models/task.h"
#include "../utils/database.h"
#include "../utils/logger.h"
#include "../utils/cache.h"

namespace mobile_backend {
namespace services {

class TaskServiceException : public std::runtime_error {
public:
    explicit TaskServiceException(const std::string& message) : std::runtime_error(message) {}
};

class TaskService {
public:
    TaskService(utils::Database& db_instance, utils::Cache<models::Task>& task_cache_instance);

    // Create a new task for a user
    models::Task create_task(int user_id, const std::string& title, const std::string& description);

    // Get a task by ID (ensuring it belongs to the specified user)
    std::optional<models::Task> get_task_by_id(int task_id, int user_id);

    // Get all tasks for a specific user
    std::vector<models::Task> get_all_tasks_for_user(int user_id, bool completed_filter = false);

    // Update an existing task (ensuring it belongs to the specified user)
    models::Task update_task(int task_id, int user_id,
                            const std::optional<std::string>& title,
                            const std::optional<std::string>& description,
                            const std::optional<bool>& completed);

    // Delete a task (ensuring it belongs to the specified user)
    void delete_task(int task_id, int user_id);

private:
    utils::Database& db;
    utils::Cache<models::Task>& task_cache;

    // Helper to convert DbRow to Task model
    std::optional<models::Task> map_db_row_to_task(const utils::DbRow& row);
};

} // namespace services
} // namespace mobile_backend

#endif // MOBILE_BACKEND_TASK_SERVICE_H
```