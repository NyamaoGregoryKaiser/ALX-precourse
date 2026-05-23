#ifndef BASE_ENTITY_H
#define BASE_ENTITY_H

#include <string>
#include <chrono> // For timestamps
#include <nlohmann/json.hpp> // For JSON serialization

// Base class for all entities, providing common fields
struct BaseEntity {
    std::string id;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    BaseEntity() = default;
    virtual ~BaseEntity() = default; // Virtual destructor for polymorphic types

    // Virtual method to convert entity to JSON
    virtual nlohmann::json toJson() const = 0;

    // Helper to convert time_point to ISO 8601 string
    std::string to_iso_string(std::chrono::system_clock::time_point tp) const {
        std::time_t tt = std::chrono::system_clock::to_time_t(tp);
        std::tm tm = *std::gmtime(&tt); // Use gmtime for UTC
        char buffer[25]; // YYYY-MM-DDTHH:MM:SSZ + null terminator
        std::strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &tm);
        return buffer;
    }
};

#endif // BASE_ENTITY_H