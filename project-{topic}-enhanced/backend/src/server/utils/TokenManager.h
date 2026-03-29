```cpp
#ifndef DATAVIZ_TOKENMANAGER_H
#define DATAVIZ_TOKENMANAGER_H

#include <string>
#include <jwt-cpp/jwt.h>

class TokenManager {
public:
    // Generates a JWT token for a given user ID and role
    static std::string generateToken(int user_id, const std::string& role, const std::string& secret);

    // Verifies a JWT token and returns the decoded token
    static jwt::decoded_jwt verifyToken(const std::string& token, const std::string& secret);
};

#endif // DATAVIZ_TOKENMANAGER_H
```