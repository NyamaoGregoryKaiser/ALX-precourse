```cpp
#include "UserController.h"
#include "services/UserService.h"
#include "utils/JsonUtils.h"
#include "utils/JwtManager.h"
#include "utils/Logger.h"
#include "middleware/AuthMiddleware.h" // For HttpError
#include "middleware/ErrorHandlingMiddleware.h"

void UserController::registerUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        Json::Value requestBody = JsonUtils::parseJson(request.body());

        User newUser;
        newUser.username = JsonUtils::getStringField(requestBody, "username");
        newUser.email = JsonUtils::getStringField(requestBody, "email");
        std::string password = JsonUtils::getStringField(requestBody, "password");

        User registeredUser = UserService::registerUser(newUser, password);

        response.headers().add<Pistache::Http::Header::ContentType>(MIME(Application, Json));
        response.send(Pistache::Http::Code::Created, JsonUtils::stringifyJson(registeredUser.toJson()));
        LOG_INFO("User registered: {}", registeredUser.username);

    } catch (const JsonParseException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const JsonFieldException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const std::runtime_error& e) { // Catch business logic errors
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const std::exception& e) {
        ErrorHandlingMiddleware::handle(response, e);
    }
}

void UserController::loginUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        Json::Value requestBody = JsonUtils::parseJson(request.body());

        std::string username = JsonUtils::getStringField(requestBody, "username");
        std::string password = JsonUtils::getStringField(requestBody, "password");

        std::optional<User> authenticatedUser = UserService::authenticateUser(username, password);

        if (authenticatedUser.has_value()) {
            std::string token = JwtManager::generateToken(authenticatedUser->id, authenticatedUser->username);

            Json::Value responseBody;
            responseBody["token"] = token;
            responseBody["user_id"] = authenticatedUser->id;
            responseBody["username"] = authenticatedUser->username;

            response.headers().add<Pistache::Http::Header::ContentType>(MIME(Application, Json));
            response.send(Pistache::Http::Code::Ok, JsonUtils::stringifyJson(responseBody));
            LOG_INFO("User logged in: {}", authenticatedUser->username);
        } else {
            ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Unauthorized, "Invalid username or password."));
        }

    } catch (const JsonParseException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const JsonFieldException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const std::runtime_error& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Internal_Server_Error, e.what()));
    } catch (const std::exception& e) {
        ErrorHandlingMiddleware::handle(response, e);
    }
}
```