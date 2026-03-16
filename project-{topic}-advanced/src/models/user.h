```cpp
#ifndef MOBILE_BACKEND_USER_H
#define MOBILE_BACKEND_USER_H

#include <string>
#include <vector>
#include <crow/json.h>

namespace mobile_backend {
namespace models {

struct User {
    int id = 0;
    std::string username;
    std::string email;
    std::string password_hash; // Stored as a hash
    std::string created_at;

    // Convert User object to Crow JSON object
    crow::json::wvalue to_json() const {
        crow::json::wvalue json_user;
        json_user["id"] = id;
        json_user["username"] = username;
        json_user["email"] = email;
        json_user["created_at"] = created_at;
        return json_user;
    }
};

} // namespace models
} // namespace mobile_backend

#endif // MOBILE_BACKEND_USER_H
```