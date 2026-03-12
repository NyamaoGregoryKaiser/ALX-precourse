```cpp
#ifndef PAYMENT_PROCESSOR_AUTH_SERVICE_HPP
#define PAYMENT_PROCESSOR_AUTH_SERVICE_HPP

#include "repositories/UserRepository.hpp"
#include <string>
#include <optional>

class AuthService {
public:
    explicit AuthService(UserRepository& userRepository);

    // Registers a new user
    User registerUser(const std::string& username, const std::string& email, const std::string& password, UserRole role);

    // Authenticates a user and returns a JWT token
    std::optional<std::string> loginUser(const std::string& username, const std::string& password);

private:
    UserRepository& userRepository;
};

#endif // PAYMENT_PROCESSOR_AUTH_SERVICE_HPP
```