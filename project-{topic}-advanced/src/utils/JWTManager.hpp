```cpp
#ifndef JWT_MANAGER_HPP
#define JWT_MANAGER_HPP

#include <string>
#include <optional>
#include <vector>
#include "jwt-cpp/jwt.h" // From jwt-cpp library
#include "Logger.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include "../models/User.hpp" // For UserRole

struct DecodedToken {
    int user_id;
    std::string username;
    UserRole role;
    long expires_at; // Unix timestamp
};

class JWTManager {
public:
    JWTManager(const std::string& secret, int expiry_minutes);

    std::string generateToken(int user_id, const std::string& username, const std::string& role_str);
    std::optional<DecodedToken> verifyToken(const std::string& token);

private:
    std::string secret_;
    int expiry_minutes_;

    UserRole stringToUserRole(const std::string& role_str);
};

#endif // JWT_MANAGER_HPP
```