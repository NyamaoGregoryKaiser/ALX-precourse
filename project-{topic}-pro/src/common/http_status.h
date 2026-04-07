```cpp
#ifndef WEBSCRAPER_HTTP_STATUS_H
#define WEBSCRAPER_HTTP_STATUS_H

// Simple wrapper for HTTP status codes, as Pistache uses its own enum
// This allows consistency if we ever switch web frameworks or need a universal enum
namespace Http {
    enum class Code {
        Ok = 200,
        Created = 201,
        Accepted = 202,
        No_Content = 204,
        Bad_Request = 400,
        Unauthorized = 401,
        Forbidden = 403,
        Not_Found = 404,
        Conflict = 409,
        Internal_Server_Error = 500,
        Service_Unavailable = 503
    };

    // Helper to convert to int (for Pistache)
    inline int toInt(Code code) {
        return static_cast<int>(code);
    }
}

#endif // WEBSCRAPER_HTTP_STATUS_H
```