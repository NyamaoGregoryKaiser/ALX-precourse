#pragma once

#include <boost/beast/http.hpp>
#include <functional>
#include <map>
#include <string>
#include <regex>
#include <nlohmann/json.hpp>

// Forward declarations
class AuthService;
class QueryAnalyzerService;
class SchemaAnalyzerService;
class UserRepository;
class QueryLogRepository;
class IndexRecommendationRepository;
class SchemaIssueRepository;
class CacheService;

namespace http = boost::beast::http;
using json = nlohmann::json;

// Define HTTP Methods for easier routing
enum class HttpMethod {
    GET, POST, PUT, DELETE, PATCH, OPTIONS
};

// Represents a route handler function
using RouteHandler = std::function<void(
    const http::request<http::string_body>& req,
    std::function<void(http::response<http::string_body>&& res)>,
    std::map<std::string, std::string>&& path_params // For dynamic route segments
)>;

struct Route {
    std::regex path_regex;
    RouteHandler handler;
    std::vector<std::string> param_names;
    bool requires_auth; // Flag for authentication
    std::string required_role; // Optional: "ADMIN", "USER", etc.
};

class RequestHandler {
public:
    RequestHandler(AuthService& authService); // Inject services
    // Add other service injections here
    void setupRoutes(); // Centralized route registration

    void handleRequest(
        http::request<http::string_body>&& req,
        std::function<void(http::response<http::string_body>&& res)> send_response
    );

private:
    void registerRoute(
        HttpMethod method,
        const std::string& path_pattern,
        RouteHandler handler,
        bool requires_auth = false,
        const std::string& required_role = ""
    );

    std::map<HttpMethod, std::vector<Route>> routes_;
    AuthService& authService_;
    // Service instances (or shared_ptrs)
    std::unique_ptr<UserRepository> userRepo_;
    std::unique_ptr<QueryLogRepository> queryLogRepo_;
    std::unique_ptr<IndexRecommendationRepository> indexRecRepo_;
    std::unique_ptr<SchemaIssueRepository> schemaIssueRepo_;
    std::unique_ptr<QueryAnalyzerService> queryAnalyzerService_;
    std::unique_ptr<SchemaAnalyzerService> schemaAnalyzerService_;
    std::unique_ptr<CacheService> cacheService_;

    // Helper to create common responses
    http::response<http::string_body> createJsonResponse(
        http::status status, const json& body, unsigned int version = 11
    );
    http::response<http::string_body> createHtmlResponse(
        http::status status, const std::string& body, unsigned int version = 11
    );
    http::response<http::string_body> createErrorResponse(
        http::status status, const std::string& message, unsigned int version = 11
    );

    // Endpoint Handlers
    void handleRoot(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleLogin(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleRegister(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleGetUsers(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleGetUserById(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleUpdateUser(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleDeleteUser(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);

    void handleGetAllRecommendations(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleGetRecommendationById(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleCreateRecommendation(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleUpdateRecommendation(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleDeleteRecommendation(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleRunQueryAnalysis(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
    void handleRunSchemaAnalysis(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);

    // Static file serving handler
    void handleStaticFile(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params);
};
```