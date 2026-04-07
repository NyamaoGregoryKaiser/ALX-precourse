```cpp
#ifndef WEBSCRAPER_USER_SERVICE_H
#define WEBSCRAPER_USER_SERVICE_H

#include "../database/user_repository.h"
#include "../models/user.h"
#include "../common/jwt_manager.h"
#include "../common/error_handler.h"
#include <string>
#include <optional>
#include <cryptopp/sha.h> // For SHA256 (password hashing)
#include <cryptopp/base64.h> // For Base64 encoding
#include <cryptopp/hex.h> // For Hex encoding

// Crypto++ requires linking libcryptopp
// For simplicity in this example, we'll use a placeholder for crypto functions
// In a real app, use a proper library like Crypto++ or OpenSSL for hashing and salting
namespace CryptoUtil {
    std::string generateSalt();
    std::string hashPassword(const std::string& password, const std::string& salt);
    bool verifyPassword(const std::string& password, const std::string& salt, const std::string& storedHash);
}

class UserService {
public:
    UserService(UserRepository& userRepo);

    std::pair<std::optional<User>, std::string> registerUser(const std::string& username, const std::string& email, const std::string& password);
    std::string loginUser(const std::string& username, const std::string& password); // Returns JWT token
    std::optional<User> getUserById(const std::string& id);

private:
    UserRepository& userRepo;
};

#endif // WEBSCRAPER_USER_SERVICE_H
```