```cpp
#ifndef AUTH_CONTROLLER_H
#define AUTH_CONTROLLER_H

#include <crow.h>
#include <string>
#include <memory>
#include "../services/AuthService.h"
#include "../models/DTOs.h"
#include "../utils/Logger.h"

namespace PaymentProcessor {
namespace Controllers {

using namespace PaymentProcessor::Services;
using namespace PaymentProcessor::Models;
using namespace PaymentProcessor::Utils;

class AuthController {
public:
    explicit AuthController(AuthService& authService) : authService(authService) {}

    // Handler for user registration
    crow::response registerUser(const crow::request& req);

    // Handler for user login
    crow::response loginUser(const crow::request& req);

private:
    AuthService& authService;
};

} // namespace Controllers
} // namespace PaymentProcessor

#endif // AUTH_CONTROLLER_H
```