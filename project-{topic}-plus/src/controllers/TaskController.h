```cpp
#ifndef TASK_CONTROLLER_H
#define TASK_CONTROLLER_H

#include <crow.h>
#include "../services/TaskService.h"
#include "../services/ProjectService.h"
#include "../services/UserService.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"
#include "../middleware/AuthMiddleware.h"

namespace TaskManager {
namespace Controllers {

class TaskController {
public:
    TaskController(Services::TaskService& task_service, Services::ProjectService& project_service, Services::UserService& user_service);

    void setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app);

private:
    Services::TaskService& task_service_;
    Services::ProjectService& project_service_;
    Services::UserService& user_service_;

    // Helper to check if user has access to a project
    bool hasProjectAccess(long long user_id, long long project_id);
};

} // namespace Controllers
} // namespace TaskManager

#endif // TASK_CONTROLLER_H
```