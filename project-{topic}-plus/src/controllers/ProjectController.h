```cpp
#ifndef PROJECT_CONTROLLER_H
#define PROJECT_CONTROLLER_H

#include <crow.h>
#include "../services/ProjectService.h"
#include "../services/UserService.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"
#include "../middleware/AuthMiddleware.h"

namespace TaskManager {
namespace Controllers {

class ProjectController {
public:
    ProjectController(Services::ProjectService& project_service, Services::UserService& user_service);

    void setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app);

private:
    Services::ProjectService& project_service_;
    Services::UserService& user_service_;
};

} // namespace Controllers
} // namespace TaskManager

#endif // PROJECT_CONTROLLER_H
```