```cpp
#include "HttpUtils.h"
#include "Logger.h"
#include <sstream>
#include <algorithm> // For std::transform
#include <cctype>    // For std::isspace, std::tolower
#include <iomanip>   // For std::hex, std::setw, std::setfill

namespace VisGenius {

std::string HttpResponse::to_string() const {
    std::ostringstream oss;
    oss << "HTTP/1.1 " << status_code << " " << status_message << "\r\n";
    for (const auto& header : headers) {
        oss << header.first << ": " << header.second << "\r\n";
    }
    oss << "\r\n"; // End of headers
    oss << body;
    return oss.str();
}

std::string get_status_message(int status_code) {
    switch (status_code) {
        case 100: return "Continue";
        case 200: return "OK";
        case 201: return "Created";
        case 204: return "No Content";
        case 400: return "Bad Request";
        case 401: return "Unauthorized";
        case 403: return "Forbidden";
        case 404: return "Not Found";
        case 405: return "Method Not Allowed";
        case 409: return "Conflict";
        case 500: return "Internal Server Error";
        case 501: return "Not Implemented";
        case 503: return "Service Unavailable";
        default:  return "Unknown Status";
    }
}

// Helper to trim whitespace from a string
static std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (std::string::npos == first) {
        return str;
    }
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

HttpRequest parse_http_request(const std::string& raw_request) {
    HttpRequest req;
    std::istringstream iss(raw_request);
    std::string line;

    // Parse request line (e.g., GET /path HTTP/1.1)
    if (std::getline(iss, line) && !line.empty()) {
        std::istringstream line_iss(line);
        line_iss >> req.method >> req.path >> req.version;
        req.path = trim(req.path); // Trim path to remove trailing spaces

        // Parse query parameters
        size_t query_pos = req.path.find('?');
        if (query_pos != std::string::npos) {
            req.query_params = parse_query_params(req.path.substr(query_pos + 1));
            req.path = req.path.substr(0, query_pos);
        }
    } else {
        LOG_WARN("Failed to parse request line: {}", raw_request);
        return req; // Return empty request on failure
    }

    // Parse headers
    while (std::getline(iss, line) && !line.empty() && line != "\r") {
        line = trim(line); // Trim line to remove potential \r
        if (line.empty()) continue; // Skip empty lines between headers or last empty line

        size_t colon_pos = line.find(':');
        if (colon_pos != std::string::npos) {
            std::string key = trim(line.substr(0, colon_pos));
            std::string value = trim(line.substr(colon_pos + 1));
            // Convert header keys to lowercase for consistent lookup
            std::transform(key.begin(), key.end(), key.begin(), ::tolower);
            req.headers[key] = value;
        } else {
            LOG_WARN("Invalid header line: {}", line);
        }
    }

    // Parse body
    // The current position of iss is after the headers and the empty line separating them.
    std::string body_content((std::istreambuf_iterator<char>(iss)), std::istreambuf_iterator<char>());
    req.body = body_content;

    LOG_DEBUG("Parsed request: Method={}, Path='{}', Body length={}", req.method, req.path, req.body.length());
    return req;
}

std::string url_decode(const std::string& encoded) {
    std::string decoded;
    decoded.reserve(encoded.length());
    for (size_t i = 0; i < encoded.length(); ++i) {
        if (encoded[i] == '%') {
            if (i + 2 < encoded.length()) {
                std::string hex = encoded.substr(i + 1, 2);
                try {
                    char c = static_cast<char>(std::stoul(hex, nullptr, 16));
                    decoded += c;
                    i += 2;
                } catch (const std::exception& e) {
                    // Invalid hex sequence, append as is or log error
                    decoded += encoded[i];
                    LOG_WARN("URL decode failed for hex sequence '%{}': {}", hex, e.what());
                }
            } else {
                // Incomplete % sequence, append as is
                decoded += encoded[i];
            }
        } else if (encoded[i] == '+') {
            decoded += ' ';
        } else {
            decoded += encoded[i];
        }
    }
    return decoded;
}

std::map<std::string, std::string> parse_query_params(const std::string& query_string) {
    std::map<std::string, std::string> params;
    std::istringstream iss(query_string);
    std::string segment;

    while (std::getline(iss, segment, '&')) {
        size_t eq_pos = segment.find('=');
        if (eq_pos != std::string::npos) {
            std::string key = url_decode(segment.substr(0, eq_pos));
            std::string value = url_decode(segment.substr(eq_pos + 1));
            params[key] = value;
        } else {
            // Parameter without value, e.g., "param" in "?param"
            params[url_decode(segment)] = "";
        }
    }
    return params;
}


} // namespace VisGenius
```