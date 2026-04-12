#pragma once

#include "soci/soci.h"
#include "soci/postgresql/soci-postgresql.h"
#include <string>
#include <memory>
#include <stdexcept>
#include <mutex>
#include <queue>
#include <atomic>

#include "utils/Logger.h"

// Custom type for chrono::system_clock::time_point
namespace soci {
    template<>
    struct type_conversion<std::chrono::system_clock::time_point> {
        typedef std::string base_type;

        static void from_base(base_type const& s, indicator ind, std::chrono::system_clock::time_point& tp) {
            if (ind == i_null) {
                // Handle null case if needed, e.g., default construct tp
                return;
            }
            std::tm t = {};
            std::istringstream ss(s);
            if (!(ss >> std::get_time(&t, "%Y-%m-%d %H:%M:%S"))) {
                 // Try with fractional seconds
                 ss.clear();
                 ss.str(s);
                 if (!(ss >> std::get_time(&t, "%Y-%m-%d %H:%M:%S.%f"))) {
                    throw soci_error("Cannot convert string to time_point: " + s);
                 }
            }
            tp = std::chrono::system_clock::from_time_t(std::mktime(&t));
        }

        static void to_base(const std::chrono::system_clock::time_point& tp, base_type& s, indicator& ind) {
            std::time_t tt = std::chrono::system_clock::to_time_t(tp);
            std::tm t = *std::gmtime(&tt); // Use gmtime for UTC or localtime for local
            std::ostringstream ss;
            ss << std::put_time(&t, "%Y-%m-%d %H:%M:%S");
            s = ss.str();
            ind = i_ok;
        }
    };
}


class DatabaseManager {
public:
    static void init(const std::string& connection_string, int pool_size = 5);
    static soci::session get_session(); // Gets a session from the pool
    static void release_session(std::unique_ptr<soci::session> session); // Returns session to the pool
    static void shutdown();

private:
    DatabaseManager() = default;
    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    static std::string connection_string_;
    static int pool_size_;
    static std::queue<std::unique_ptr<soci::session>> session_pool_;
    static std::mutex pool_mutex_;
    static std::atomic<bool> initialized_;
};