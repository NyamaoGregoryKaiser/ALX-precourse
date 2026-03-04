#include "AuthController.h"

#include <iostream>

AuthController::AuthController(DBManager& db_manager, const std::string& jwt_secret)
    : db_manager_(db_manager), jwt_secret_(jwt_secret) {}

std::string AuthController::hashPassword(const std::string& password) {
    // In a real application, use a strong KDF like Argon2, bcrypt, or scrypt.
    // Example: Using `argon2` library.
    // char hash[100];
    // argon2i_hash_encoded(t_cost, m_cost, parallelism, password.c_str(), password.length(),
    //                      salt, salt_len, hash, sizeof(hash));
    // return std::string(hash);
    
    // Placeholder: Return a simple SHA256 (very insecure for passwords!)
    // For demonstration purposes only.
    Logger::warn("Using INSECURE password hashing placeholder in AuthController::hashPassword.");
    std::string hashed_password = "hashed_" + password; // Dummy hash
    return hashed_password;
}

bool AuthController::verifyPassword(const std::string& password, const std::string& hashed_password) {
    // Compare password with hashed_password using the same KDF algorithm
    Logger::warn("Using INSECURE password verification placeholder in AuthController::verifyPassword.");
    return ("hashed_" + password) == hashed_password; // Dummy verification
}

HttpResponse AuthController::registerUser(const HttpRequest& req) {
    try {
        nlohmann::json body = nlohmann::json::parse(req.body);
        std::string username = body["username"];
        std::string email = body["email"];
        std::string password = body["password"];

        if (username.empty() || email.empty() || password.empty()) {
            return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Username, email, and password are required"}}).dump());
        }

        // Check if user already exists
        User existing_user = db_manager_.findUserByEmail(email);
        if (!existing_user.id.empty()) {
            return HttpResponse(http::status::conflict, nlohmann::json({{"error", "User with this email already exists"}}).dump());
        }

        User new_user;
        new_user.id = UUID::generate(); // Generate a new UUID
        new_user.username = username;
        new_user.email = email;
        new_user.password_hash = hashPassword(password);
        new_user.created_at = std::chrono::system_clock::now();
        new_user.updated_at = new_user.created_at;

        db_manager_.createUser(new_user);
        Logger::info("User registered: " + new_user.email);

        nlohmann::json response_json = {
            {"message", "User registered successfully"},
            {"user_id", new_user.id}
        };
        return HttpResponse(http::status::created, response_json.dump());

    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JSON Parse Error in registerUser: " + std::string(e.what()));
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Invalid JSON format"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error registering user: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to register user", "details", e.what()}}).dump());
    }
}

HttpResponse AuthController::loginUser(const HttpRequest& req) {
    try {
        nlohmann::json body = nlohmann::json::parse(req.body);
        std::string email = body["email"];
        std::string password = body["password"];

        if (email.empty() || password.empty()) {
            return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Email and password are required"}}).dump());
        }

        User user = db_manager_.findUserByEmail(email);
        if (user.id.empty()) {
            return HttpResponse(http::status::unauthorized, nlohmann::json({{"error", "Invalid credentials"}}).dump());
        }

        if (!verifyPassword(password, user.password_hash)) {
            return HttpResponse(http::status::unauthorized, nlohmann::json({{"error", "Invalid credentials"}}).dump());
        }

        std::string token = JWT::generateToken(user.id, jwt_secret_);
        Logger::info("User logged in: " + user.email);

        nlohmann::json response_json = {
            {"message", "Login successful"},
            {"token", token},
            {"user_id", user.id}
        };
        return HttpResponse(http::status::ok, response_json.dump());

    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JSON Parse Error in loginUser: " + std::string(e.what()));
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Invalid JSON format"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error logging in user: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to login", "details", e.what()}}).dump());
    }
}