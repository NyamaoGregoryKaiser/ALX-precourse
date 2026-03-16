```cpp
#ifndef MOBILE_BACKEND_TASK_CONTROLLER_H
#define MOBILE_BACKEND_TASK_CONTROLLER_H

#include <crow/crow.h>
#include "../services/task_service.h"
#include "../utils/error_middleware.h"
#include "../utils/auth_middleware.h"
#include "../utils/logger.h"

namespace mobile_backend {
namespace controllers {

class TaskController {
public:
    TaskController(services::TaskService& task_service_instance)
        : task_service(task_service_instance) {}

    // Create a new task
    crow::response create_task(const crow::request& req, crow::response& res,
                               const utils::AuthMiddleware::context& ctx);

    // Get a specific task by ID
    crow::response get_task_by_id(const crow::request& req, crow::response& res,
                                  const utils::AuthMiddleware::context& ctx, int task_id);

    // Get all tasks for the authenticated user
    crow::response get_all_tasks(const crow::request& req, crow::response& res,
                                 const utils::AuthMiddleware::context& ctx);

    // Update an existing task
    crow::response update_task(const crow::request& req, crow::response& res,
                               const utils::AuthMiddleware::context& ctx, int task_id);

    // Delete a task
    crow::response delete_task(const crow::request& req, crow::response& res,
                               const utils::AuthMiddleware::context& ctx, int task_id);

private:
    services::TaskService& task_service;
};

} // namespace controllers
} // namespace mobile_backend

#endif // MOBILE_BACKEND_TASK_CONTROLLER_H
```