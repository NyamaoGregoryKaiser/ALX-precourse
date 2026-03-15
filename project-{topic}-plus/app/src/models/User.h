#ifndef USER_H
#define USER_H

#include <string>
#include <ctime>
#include <crow.h> // For JSON serialization/deserialization
#include <optional>

// Forward declaration of Database for friendship if needed, but better to keep models decoupled from DB directly.
// Models should be data structures, not ORMs.

class User {
public:
    long long id;
    std::string username;
    std::string email;
    std::string password_hash;
    std::string role; // e.g., "USER", "ADMIN"
    std::string created_at;
    std::string updated_at;

    User() : id(0) {} // Default constructor

    User(long long id, const std::string& username, const std::string& email,
         const std::string& password_hash, const std::string& role,
         const std::string& created_at, const std::string& updated_at)
        : id(id), username(username), email(email), password_hash(password_hash),
          role(role), created_at(created_at), updated_at(updated_at) {}

    // Constructor without ID (for new users)
    User(const std::string& username, const std::string& email,
         const std::string& password_hash, const std::string& role)
        : id(0), username(username), email(email), password_hash(password_hash),
          role(role) {
        // Set creation/update timestamps
        time_t rawtime;
        struct tm *timeinfo;
        char buffer[80];

        time(&rawtime);
        timeinfo = gmtime(&rawtime); // Use GMT for consistency
        strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
        created_at = buffer;
        updated_at = buffer;
    }

    // Convert to JSON (excluding password_hash for security)
    crow::json::wvalue to_json() const {
        crow::json::wvalue json_obj;
        json_obj["id"] = id;
        json_obj["username"] = username;
        json_obj["email"] = email;
        json_obj["role"] = role;
        json_obj["created_at"] = created_at;
        json_obj["updated_at"] = updated_at;
        return json_obj;
    }

    // Factory method to create User from JSON (for creating/updating from request)
    static std::optional<User> from_json(const crow::json::rvalue& json, long long id = 0) {
        if (!json.has("username") || !json.has("email") || !json.has("password_hash")) {
             // For update, password_hash might be optional, handle in service.
             // For simplicity here, assume full data for creation.
            return std::nullopt;
        }

        User user;
        user.id = id;
        user.username = json["username"].s();
        user.email = json["email"].s();
        user.password_hash = json["password_hash"].s();
        user.role = json.has("role") ? json["role"].s() : "USER";

        // Timestamps will be set by DB or another constructor
        return user;
    }
};

#endif // USER_H