```cpp
#ifndef USER_CONTROLLER_H
#define USER_CONTROLLER_H

#include <crow.h>
#include "../services/UserService.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"
#include "../middleware/AuthMiddleware.h"

namespace TaskManager {
namespace Controllers {

class UserController {
public:
    UserController(Services::UserService& user_service);

    void setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app);

private:
    Services::UserService& user_service_;
};

} // namespace Controllers
} // namespace TaskManager

#endif // USER_CONTROLLER_H
```