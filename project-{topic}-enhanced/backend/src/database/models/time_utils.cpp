#include "User.h" // Included for consistency, actually provides the function
#include <iomanip>
#include <sstream>

std::string to_iso8601(std::chrono::system_clock::time_point tp) {
    auto in_time_t = std::chrono::system_clock::to_time_t(tp);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}