```cpp
#ifndef APIEXCEPTION_H
#define APIEXCEPTION_H

#include <stdexcept>
#include <string>
#include <crow.h> // For crow::status

// Custom exception for API errors
class ApiException : public std::runtime_error {
public:
    ApiException(crow::status status, const std::string& message)
        : std::runtime_error(message), status_code_(status) {}

    crow::status get_status_code() const {
        return status_code_;
    }

private:
    crow::status status_code_;
};

#endif // APIEXCEPTION_H

```