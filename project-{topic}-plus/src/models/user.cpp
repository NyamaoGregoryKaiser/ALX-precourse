#include "user.h"
#include <ctime> // For tm
#include <iomanip> // For put_time
#include <sstream> // For stringstream

// Helper function to convert std::chrono::system_clock::time_point to string
std::string to_iso8601(const std::chrono::system_clock::time_point& tp) {
    std::time_t t = std::chrono::system_clock::to_time_t(tp);
    std::tm tm_buf;
    gmtime_r(&t, &tm_buf); // Use gmtime_r for thread-safety
    std::stringstream ss;
    ss << std::put_time(&tm_buf, "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

// JSON serialization for User
void to_json(nlohmann::json& j, const User& u) {
    j["id"] = u.id;
    j["username"] = u.username;
    j["email"] = u.email;
    // Do NOT expose password_hash in API responses
    j["created_at"] = to_iso8601(u.created_at);
    j["updated_at"] = to_iso8601(u.updated_at);
}

// JSON deserialization for User (for registration/update requests)
void from_json(const nlohmann::json& j, User& u) {
    // ID, created_at, updated_at are typically set by the DB, not from request body
    if (j.contains("username")) j.at("username").get_to(u.username);
    if (j.contains("email")) j.at("email").get_to(u.email);
    if (j.contains("password")) { // Password will be hashed by service layer
        std::string password;
        j.at("password").get_to(password);
        u.password_hash = password; // Temporarily store, will be hashed later
    }
}
```