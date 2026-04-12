#pragma once

#include <string>
#include <chrono>

struct AuthToken {
    int user_id = 0;
    std::string username;
    std::string role; // "USER" or "ADMIN"
    long iat = 0; // issued at
    long exp = 0; // expiration time

    bool is_valid() const {
        return user_id > 0 && !username.empty() && exp > std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    }
};