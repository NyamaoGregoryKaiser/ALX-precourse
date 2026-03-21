```cpp
#include "AuthController.h"
#include <nlohmann/json.hpp>

namespace PaymentProcessor {
namespace Controllers {

crow::response AuthController::registerUser(const crow::request& req) {
    LOG_INFO("Received request for user registration.");
    auto jsonBody = nlohmann::json::parse(req.body);

    RegisterUserRequestDTO registerDto;
    registerDto.from_json(jsonBody);

    UserRole role;
    if (registerDto.role == "ADMIN") role = UserRole::ADMIN;
    else if (registerDto.role == "MERCHANT") role = UserRole::MERCHANT;
    else if (registerDto.role == "VIEWER") role = UserRole::VIEWER;
    else {
        LOG_WARN("Invalid role specified during registration: {}", registerDto.role);
        return crow::response(400, nlohmann::json{{"error", "Invalid user role specified."}}.dump());
    }

    User newUser = authService.registerUser(registerDto.username, registerDto.password, registerDto.email, role);
    LOG_INFO("User {} registered successfully.", newUser.username);

    crow::response res(201); // Created
    res.set_header("Content-Type", "application/json");
    res.write(newUser.toJson().dump());
    return res;
}

crow::response AuthController::loginUser(const crow::request& req) {
    LOG_INFO("Received request for user login.");
    auto jsonBody = nlohmann::json::parse(req.body);

    LoginRequestDTO loginDto;
    loginDto.from_json(jsonBody);

    std::string token = authService.login(loginDto.username, loginDto.password);

    // Retrieve the user to include in the response (without password hash)
    auto user_opt = Database::DatabaseManager::getInstance().findUserByUsername(loginDto.username);
    if (!user_opt.has_value()) {
        LOG_ERROR("User {} authenticated but could not be retrieved from DB for login response. This should not happen.", loginDto.username);
        throw PaymentProcessor::Exceptions::PaymentProcessorException("Internal error during login response generation.");
    }

    LoginResponseDTO responseDto;
    responseDto.token = token;
    responseDto.user = user_opt.value();

    LOG_INFO("User {} logged in successfully.", loginDto.username);
    crow::response res(200); // OK
    res.set_header("Content-Type", "application/json");
    res.write(responseDto.toJson().dump());
    return res;
}

} // namespace Controllers
} // namespace PaymentProcessor
```