#include "User.h"
#include "../utils/JsonUtils.h"
#include "../logger/Logger.h"
#include <stdexcept>
#include <chrono>
#include <iomanip> // For std::put_time

// Helper function to convert string to UserRole
UserRole string_to_user_role(const std::string& role_str) {
    if (role_str == "admin") {
        return UserRole::ADMIN;
    } else if (role_str == "customer") {
        return UserRole::CUSTOMER;
    }
    Logger::get_logger()->warn("Unknown user role string: {}", role_str);
    return UserRole::UNKNOWN;
}

// Helper function to convert UserRole to string
std::string user_role_to_string(UserRole role) {
    switch (role) {
        case UserRole::ADMIN: return "admin";
        case UserRole::CUSTOMER: return "customer";
        default: return "unknown";
    }
}

// Helper to convert ISO 8601 string to time_point
std::chrono::system_clock::time_point parse_iso_string(const std::string& iso_str) {
    std::tm tm{};
    std::istringstream ss(iso_str);
    // Attempt to parse with or without fractional seconds
    // YYYY-MM-DDTHH:MM:SS[.sss]Z
    if (!(ss >> std::get_time(&tm, "%Y-%m-%dT%H:%M:%S")) || ss.fail()) {
        // Handle potential failure or different formats if necessary
        Logger::get_logger()->error("Failed to parse timestamp: {}", iso_str);
        return std::chrono::system_clock::time_point{}; // Return epoch
    }
    // Discard fractional seconds and 'Z' if present
    std::string suffix;
    ss >> suffix; // Read 'Z' or ".sssZ"
    
    std::time_t tt = std::mktime(&tm);
    if (tt == -1) { // mktime failed
         Logger::get_logger()->error("Failed to convert tm to time_t for: {}", iso_str);
        return std::chrono::system_clock::time_point{};
    }
    return std::chrono::system_clock::from_time_t(tt);
}


User::User(const std::string& username, const std::string& email, const std::string& password_hash,
           const std::string& first_name, UserRole role)
    : BaseEntity(), username(username), email(email), password_hash(password_hash),
      role(role), first_name(first_name) {
    // Generate a UUID for ID (simplified for example, typically use a library like Boost.UUID)
    this->id = "usr_" + std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(
                                    std::chrono::system_clock::now().time_since_epoch()).count());
    this->created_at = std::chrono::system_clock::now();
    this->updated_at = this->created_at;
}

User::User(const std::string& id, const std::string& username, const std::string& email,
           const std::string& password_hash, UserRole role,
           const std::string& first_name, const std::optional<std::string>& last_name,
           const std::optional<std::string>& phone_number, const std::optional<std::string>& address,
           std::chrono::system_clock::time_point created_at, std::chrono::system_clock::time_point updated_at)
    : BaseEntity({id, created_at, updated_at}),
      username(username), email(email), password_hash(password_hash), role(role),
      first_name(first_name), last_name(last_name), phone_number(phone_number), address(address) {}

nlohmann::json User::toJson() const {
    nlohmann::json j;
    j["id"] = id;
    j["username"] = username;
    j["email"] = email;
    j["first_name"] = first_name;
    if (last_name) j["last_name"] = *last_name;
    if (phone_number) j["phone_number"] = *phone_number;
    if (address) j["address"] = *address;
    j["role"] = user_role_to_string(role);
    j["created_at"] = to_iso_string(created_at);
    j["updated_at"] = to_iso_string(updated_at);
    return j;
}

User User::fromJson(const nlohmann::json& j) {
    // Required fields
    std::vector<std::string> required_keys = {"username", "email", "password", "first_name"};
    if (!JsonUtils::containsAllKeys(j, required_keys)) {
        throw std::runtime_error("Missing required fields for User creation.");
    }

    // Optional fields
    std::string username = JsonUtils::getString(j, "username").value();
    std::string email = JsonUtils::getString(j, "email").value();
    std::string password = JsonUtils::getString(j, "password").value(); // Raw password
    std::string first_name = JsonUtils::getString(j, "first_name").value();
    
    std::string role_str = JsonUtils::getString(j, "role").value_or("customer"); // Default to customer
    UserRole role = string_to_user_role(role_str);

    // This creates a temporary user to hash the password
    User newUser(username, email, "TEMP_PASSWORD_HASH", first_name, role);
    newUser.last_name = JsonUtils::getString(j, "last_name");
    newUser.phone_number = JsonUtils::getString(j, "phone_number");
    newUser.address = JsonUtils::getString(j, "address");
    
    return newUser; // Password hashing will be done in UserService
}

User User::fromSql(const std::string& id, const std::string& username, const std::string& email,
                   const std::string& password_hash, const std::string& role_str,
                   const std::string& first_name, const std::optional<std::string>& last_name,
                   const std::optional<std::string>& phone_number, const std::optional<std::string>& address,
                   const std::string& created_at_str, const std::string& updated_at_str) {
    return User(
        id, username, email, password_hash,
        string_to_user_role(role_str),
        first_name, last_name, phone_number, address,
        parse_iso_string(created_at_str), parse_iso_string(updated_at_str)
    );
}