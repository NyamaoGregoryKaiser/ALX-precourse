#pragma once

#include <string>
#include <vector>
#include <map>
#include <optional>
#include <stdexcept>

// Simple HTTP client using cURLpp
class HttpUtils {
public:
    struct HttpResponse {
        long status_code = 0;
        std::string body;
        std::map<std::string, std::string> headers;
        std::string error_message; // For internal errors, not HTTP error codes

        bool is_success() const { return status_code >= 200 && status_code < 300; }
    };

    static HttpResponse get(const std::string& url, const std::map<std::string, std::string>& headers = {});
    static HttpResponse post(const std::string& url, const std::string& body, const std::map<std::string, std::string>& headers = {});
    // Add put, delete etc. as needed
};