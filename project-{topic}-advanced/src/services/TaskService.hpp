```cpp
#ifndef TASK_SERVICE_HPP
#define TASK_SERVICE_HPP

#include <memory>
#include <string>
#include <vector>
#include <optional>
#include "../models/Task.hpp"
#include "../models/Project.hpp"
#include "../models/User.hpp"
#include "../database/DatabaseManager.hpp"
#include "../utils/Logger.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include "../models/DTOs.hpp" // For TaskCreateDTO, TaskUpdateDTO

class TaskService {
public:
    TaskService(std::shared_ptr<DatabaseManager> db_manager);

    Task createTask(const TaskCreateDTO& task_dto);
    std::optional<Task> getTaskById(int id);
    std::vector<Task> getAllTasks();
    std::vector<Task> getTasksByProjectId(int project_id);
    std::vector<Task> getTasksByAssignedUserId(int user_id);
    Task updateTask(int id, const TaskUpdateDTO& task_dto);
    bool deleteTask(int id);

private:
    std::shared_ptr<DatabaseManager> db_manager_;
};

#endif // TASK_SERVICE_HPP
```