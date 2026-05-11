#pragma once

#include <string>
#include <optional>
#include <map>
#include "../models/User.h"
#include "../common/Exceptions.h"

class AuthService; // Forward declaration

class AuthMiddleware {
public:
    AuthMiddleware() = default;
    User authenticate(const std::string& auth_header, AuthService& authService);
};
```