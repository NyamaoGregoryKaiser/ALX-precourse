```cpp
#ifndef AUTH_CONTROLLER_H
#define AUTH_CONTROLLER_H

#include <crow.h>
#include "../services/AuthService.h"
#include "../services/UserService.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"
#include "../middleware/AuthMiddleware.h"

namespace TaskManager {
namespace Controllers {

class AuthController {
public:
    AuthController(Services::AuthService& auth_service, Services::UserService& user_service);

    void setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app);

private:
    Services::AuthService& auth_service_;
    Services::UserService& user_service_;
};

} // namespace Controllers
} // namespace TaskManager

#endif // AUTH_CONTROLLER_H
```