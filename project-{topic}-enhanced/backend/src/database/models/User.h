#pragma once

#include <string>
#include <chrono>
#include <nlohmann/json.hpp>

// Time point to string conversion helper
std::string to_iso8601(std::chrono::system_clock::time_point tp);

struct User {
    std::string id;
    std::string username;
    std::string email;
    std::string password_hash;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    // Default constructor for empty User (e.g., when not found)
    User() = default;

    // Convert to JSON (excluding password_hash)
    nlohmann::json toJson() const {
        return nlohmann::json{
            {"id", id},
            {"username", username},
            {"email", email},
            {"created_at", to_iso8601(created_at)},
            {"updated_at", to_iso8601(updated_at)}
        };
    }
};