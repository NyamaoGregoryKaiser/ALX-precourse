```cpp
#include "AuthHandler.h"
#include "util/ErrorHandler.h"
#include "core/common/Utils.h" // For hashing

// For JSON parsing (conceptual)
#include <nlohmann/json.hpp>

namespace VisuFlow {
namespace API {

AuthHandler::AuthHandler()
    : m_jwtManager(Core::Config::ConfigManager::getInstance().getString("jwt_secret", "supersecretjwtkey")),
      m_userRepository() {} // Initialize with DB connection if needed

void AuthHandler::handleLogin(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        LoginRequest loginReq = parseLoginRequest(req);

        // 1. Authenticate user
        VisuFlow::Data::Model::User user = m_userRepository.findByUsername(loginReq.username);
        if (user.id == 0) { // User not found
            throw Util::APIException("Invalid credentials", 401);
        }

        // Hash the provided password and compare (conceptual, in real app, use secure hashing like Argon2, bcrypt)
        std::string hashedInputPassword = VisuFlow::Core::Common::Utils::sha256(loginReq.password);
        if (hashedInputPassword != user.hashedPassword) {
            throw Util::APIException("Invalid credentials", 401);
        }

        // 2. Generate JWT token
        std::string token = m_jwtManager.createToken(user.id, user.username, user.role);

        // 3. Send response
        LoginResponse loginRes;
        loginRes.token = token;
        loginRes.userId = user.id;
        loginRes.username = user.username;
        loginRes.role = user.role;
        sendLoginResponse(loginRes, res);
        Util::Logger::log(spdlog::level::info, "User {} logged in successfully.", loginReq.username);

    } catch (const Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const nlohmann::json::exception& e) {
        Util::ErrorHandler::handleAPIException(Util::APIException("Invalid JSON payload", 400), res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}

LoginRequest AuthHandler::parseLoginRequest(const Http::Rest::Request& req) {
    // In a real Pistache/Crow/cpprestsdk app, `req.body()` would contain the JSON string.
    // We mock a simple parsing here.
    nlohmann::json jsonBody = nlohmann::json::parse(req); // Assume req is the JSON string for simplicity
    LoginRequest loginReq;
    loginReq.username = jsonBody.at("username").get<std::string>();
    loginReq.password = jsonBody.at("password").get<std::string>();
    return loginReq;
}

void AuthHandler::sendLoginResponse(const LoginResponse& loginRes, Http::Rest::Response& res, int statusCode) {
    nlohmann::json responseJson;
    responseJson["token"] = loginRes.token;
    responseJson["userId"] = loginRes.userId;
    responseJson["username"] = loginRes.username;
    responseJson["role"] = loginRes.role;

    res = responseJson.dump(); // For mock, just assign JSON string
    // In real Pistache: res.headers().add<Http::Header::ContentType>(MIME(Application, Json));
    // res.send(Http::Code::Ok, responseJson.dump());
    Util::Logger::log(spdlog::level::debug, "AuthHandler sending login response: {}", res);
}

} // namespace API
} // namespace VisuFlow
```