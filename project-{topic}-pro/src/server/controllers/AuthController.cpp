```cpp
#include "server/controllers/AuthController.hpp"
#include "exceptions/ApiException.hpp"
#include "util/CryptoUtils.hpp"
#include "util/Logger.hpp"

AuthController::AuthController(AuthService& authService) : authService(authService) {}

void AuthController::registerUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        nlohmann::json body = nlohmann::json::parse(request.body());

        std::string username = body.at("username").get<std::string>();
        std::string email = body.at("email").get<std::string>();
        std::string password = body.at("password").get<std::string>();
        std::string roleStr = body.value("role", "customer"); // Default to customer

        UserRole role;
        if (roleStr == "admin") role = UserRole::Admin;
        else if (roleStr == "merchant") role = UserRole::Merchant;
        else role = UserRole::Customer;

        User newUser = authService.registerUser(username, email, password, role);

        nlohmann::json respBody = newUser.toJson();
        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Pistache::Http::Code::Created, respBody.dump());
        Logger::get()->info("User {} registered successfully.", username);

    } catch (const nlohmann::json::exception& e) {
        Logger::get()->warn("JSON parsing error in registerUser: {}", e.what());
        response.send(Pistache::Http::Code::Bad_Request, "Invalid JSON body: " + std::string(e.what()));
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error registering user: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

void AuthController::loginUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        nlohmann::json body = nlohmann::json::parse(request.body());

        std::string username = body.at("username").get<std::string>();
        std::string password = body.at("password").get<std::string>();

        std::optional<std::string> token = authService.loginUser(username, password);

        if (token.has_value()) {
            nlohmann::json respBody;
            respBody["token"] = token.value();
            response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
            response.send(Pistache::Http::Code::Ok, respBody.dump());
            Logger::get()->info("User {} logged in successfully.", username);
        } else {
            // Should be handled by AuthService throwing UnauthorizedException, but as a fallback
            response.send(Pistache::Http::Code::Unauthorized, "Invalid credentials.");
        }

    } catch (const nlohmann::json::exception& e) {
        Logger::get()->warn("JSON parsing error in loginUser: {}", e.what());
        response.send(Pistache::Http::Code::Bad_Request, "Invalid JSON body: " + std::string(e.what()));
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error logging in user: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

std::optional<JwtTokenDetails> AuthController::getAuthenticatedUserDetails(const Pistache::Rest::Request& request) {
    const auto& authHeader = request.headers().tryGet<Pistache::Http::Header::Authorization>();

    if (!authHeader) {
        return std::nullopt;
    }

    std::string token = authHeader->value();
    if (token.length() < 7 || token.substr(0, 6) != "Bearer") {
        return std::nullopt;
    }
    token = token.substr(7); // Extract token part

    return CryptoUtils::verifyJwtToken(token);
}
```