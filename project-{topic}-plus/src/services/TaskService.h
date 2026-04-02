```cpp
#ifndef TASK_SERVICE_H
#define TASK_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include "../models/Task.h"
#include "../database/Database.h"
#include "../utils/Logger.h"
#include "../exceptions/CustomExceptions.h"
#include "../cache/Cache.h"

namespace TaskManager {
namespace Services {

class TaskService {
public:
    TaskService(Database::Database& db, Cache::Cache& cache);

    // CRUD Operations
    Models::Task createTask(Models::Task task);
    std::optional<Models::Task> getTaskById(long long id);
    std::vector<Models::Task> getAllTasks(int limit = 100, int offset = 0);
    std::vector<Models::Task> getTasksByProject(long long project_id, int limit = 100, int offset = 0);
    std::vector<Models::Task> getTasksAssignedToUser(long long assigned_to_id, int limit = 100, int offset = 0);
    Models::Task updateTask(long long id, const Models::Task& task_updates);
    void deleteTask(long long id);

private:
    Database::Database& db_;
    Cache::Cache& cache_;

    std::optional<Models::Task> mapRowToTask(const Database::Row& row);
    std::string generateCacheKey(long long taskId);
    void invalidateTaskCache(long long taskId);
};

} // namespace Services
} // namespace TaskManager

#endif // TASK_SERVICE_H
```