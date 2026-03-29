```cpp
#ifndef TASK_CONTROLLER_HPP
#define TASK_CONTROLLER_HPP

#include "crow.h"
#include <memory>
#include "../services/TaskService.hpp"
#include "../services/ProjectService.hpp" // To validate project ownership
#include "../services/UserService.hpp" // To validate assigned_user existence
#include "../utils/JSONConverter.hpp"
#include "../utils/ErrorHandler.hpp"
#include "../middleware/AuthMiddleware.hpp"
#include "../models/DTOs.hpp"

class TaskController {
public:
    TaskController(std::shared_ptr<TaskService> task_service,
                   std::shared_ptr<ProjectService> project_service,
                   std::shared_ptr<UserService> user_service);

    void registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app);

private:
    std::shared_ptr<TaskService> task_service_;
    std::shared_ptr<ProjectService> project_service_;
    std::shared_ptr<UserService> user_service_; // For additional validation or lookups

    // Helper to check if user can manage tasks for a project
    bool canManageProjectTasks(const AuthContext& ctx, int project_id);
};

#endif // TASK_CONTROLLER_HPP
```