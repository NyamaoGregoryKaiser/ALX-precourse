#include "RequestHandler.h"
#include "AuthMiddleware.h"
#include "ErrorHandler.h"
#include "RateLimiter.h"
#include "StaticFileHandler.h"
#include "ViewRenderer.h"
#include "../utils/Logger.h"
#include "../utils/JsonUtils.h"
#include "../common/Exceptions.h"
#include "../services/AuthService.h"
#include "../services/QueryAnalyzerService.h"
#include "../services/SchemaAnalyzerService.h"
#include "../services/CacheService.h"
#include "../db/DbConnection.h"
#include "../db/repositories/UserRepository.h"
#include "../db/repositories/QueryLogRepository.h"
#include "../db/repositories/IndexRecommendationRepository.h"
#include "../db/repositories/SchemaIssueRepository.h"

#include <iostream>
#include <regex>
#include <vector>
#include <string>

// Helper to convert method enum to Boost.Beast method
static http::verb to_beast_verb(HttpMethod method) {
    switch (method) {
        case HttpMethod::GET: return http::verb::get;
        case HttpMethod::POST: return http::verb::post;
        case HttpMethod::PUT: return http::verb::put;
        case HttpMethod::DELETE: return http::verb::delete_;
        case HttpMethod::PATCH: return http::verb::patch;
        case HttpMethod::OPTIONS: return http::verb::options;
        default: return http::verb::unknown;
    }
}

// Global instances for middleware (can be managed better with DI)
AuthMiddleware authMiddleware;
RateLimiter rateLimiter(10, std::chrono::seconds(60)); // 10 requests per minute
ErrorHandler errorHandler;
StaticFileHandler staticFileHandler("./web"); // Path to static files

RequestHandler::RequestHandler(AuthService& authService)
    : authService_(authService) {
    // Initialize repositories and services with DB connection pool
    auto conn_provider = []() { return DbConnection::getPool().getConnection(); };
    userRepo_ = std::make_unique<UserRepository>(conn_provider);
    queryLogRepo_ = std::make_unique<QueryLogRepository>(conn_provider);
    indexRecRepo_ = std::make_unique<IndexRecommendationRepository>(conn_provider);
    schemaIssueRepo_ = std::make_unique<SchemaIssueRepository>(conn_provider);
    queryAnalyzerService_ = std::make_unique<QueryAnalyzerService>(*queryLogRepo_, *indexRecRepo_);
    schemaAnalyzerService_ = std::make_unique<SchemaAnalyzerService>(*schemaIssueRepo_);
    cacheService_ = std::make_unique<CacheService>();
}

void RequestHandler::registerRoute(
    HttpMethod method, const std::string& path_pattern, RouteHandler handler,
    bool requires_auth, const std::string& required_role) {

    // Convert path pattern like "/api/users/{id}" to regex "/api/users/([^/]+)"
    // And extract parameter names like "id"
    std::string regex_str = "^" + path_pattern + "$";
    std::vector<std::string> param_names;
    std::regex param_regex(R"(\{([a-zA-Z0-9_]+)\})");
    std::smatch matches;

    std::string::const_iterator search_start(regex_str.cbegin());
    while (std::regex_search(search_start, regex_str.cend(), matches, param_regex)) {
        param_names.push_back(matches[1].str());
        regex_str.replace(matches.position(), matches.length(), "([^/]+)");
        search_start = regex_str.cbegin() + matches.position() + std::string("([^/]+)").length();
    }
    
    routes_[method].push_back({std::regex(regex_str), std::move(handler), param_names, requires_auth, required_role});
    LOG_DEBUG("Registered route: {} {}", http::to_string(to_beast_verb(method)), path_pattern);
}

void RequestHandler::setupRoutes() {
    // Frontend Routes (minimal C++ rendered HTML)
    registerRoute(HttpMethod::GET, "/", std::bind(&RequestHandler::handleRoot, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));
    registerRoute(HttpMethod::GET, "/web/{filename}", std::bind(&RequestHandler::handleStaticFile, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));

    // Authentication Routes
    registerRoute(HttpMethod::POST, "/api/v1/auth/login", std::bind(&RequestHandler::handleLogin, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));
    registerRoute(HttpMethod::POST, "/api/v1/auth/register", std::bind(&RequestHandler::handleRegister, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));

    // User Management (Admin only)
    registerRoute(HttpMethod::GET, "/api/v1/users", std::bind(&RequestHandler::handleGetUsers, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true, "ADMIN");
    registerRoute(HttpMethod::GET, "/api/v1/users/{id}", std::bind(&RequestHandler::handleGetUserById, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true, "ADMIN");
    registerRoute(HttpMethod::PUT, "/api/v1/users/{id}", std::bind(&RequestHandler::handleUpdateUser, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true, "ADMIN");
    registerRoute(HttpMethod::DELETE, "/api/v1/users/{id}", std::bind(&RequestHandler::handleDeleteUser, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true, "ADMIN");

    // Optimization Recommendations (Authenticated users)
    registerRoute(HttpMethod::GET, "/api/v1/recommendations", std::bind(&RequestHandler::handleGetAllRecommendations, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true);
    registerRoute(HttpMethod::GET, "/api/v1/recommendations/{id}", std::bind(&RequestHandler::handleGetRecommendationById, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true);
    registerRoute(HttpMethod::POST, "/api/v1/recommendations", std::bind(&RequestHandler::handleCreateRecommendation, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true);
    registerRoute(HttpMethod::PUT, "/api/v1/recommendations/{id}", std::bind(&RequestHandler::handleUpdateRecommendation, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true);
    registerRoute(HttpMethod::DELETE, "/api/v1/recommendations/{id}", std::bind(&RequestHandler::handleDeleteRecommendation, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true);

    // Analysis Endpoints (Admin or specific role)
    registerRoute(HttpMethod::POST, "/api/v1/analyze/queries", std::bind(&RequestHandler::handleRunQueryAnalysis, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true, "ADMIN");
    registerRoute(HttpMethod::POST, "/api/v1/analyze/schema", std::bind(&RequestHandler::handleRunSchemaAnalysis, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3), true, "ADMIN");
    // Add routes for QueryLogs, SchemaIssues etc.
}


void RequestHandler::handleRequest(
    http::request<http::string_body>&& req,
    std::function<void(http::response<http::string_body>&& res)> send_response) {

    try {
        // 1. Rate Limiting Middleware
        if (!rateLimiter.check(req.remote_endpoint().address().to_string())) {
            send_response(createErrorResponse(http::status::too_many_requests, "Too many requests"));
            return;
        }

        HttpMethod req_method;
        if (req.method() == http::verb::get) req_method = HttpMethod::GET;
        else if (req.method() == http::verb::post) req_method = HttpMethod::POST;
        else if (req.method() == http::verb::put) req_method = HttpMethod::PUT;
        else if (req.method() == http::verb::delete_) req_method = HttpMethod::DELETE;
        else if (req.method() == http::verb::patch) req_method = HttpMethod::PATCH;
        else if (req.method() == http::verb::options) req_method = HttpMethod::OPTIONS;
        else {
            send_response(createErrorResponse(http::status::method_not_allowed, "Method not allowed"));
            return;
        }

        std::string target = std::string(req.target());
        
        // Try to handle static files first
        if (target.rfind("/web/", 0) == 0 || target == "/") { // Handle / and /web/* directly
             std::map<std::string, std::string> params;
             if (target == "/") {
                params["filename"] = "index.html"; // Default to index.html for root
             } else {
                params["filename"] = target.substr(5); // Extract filename from /web/
             }
             handleStaticFile(req, send_response, std::move(params));
             return;
        }

        for (const auto& route : routes_[req_method]) {
            std::smatch match;
            if (std::regex_match(target, match, route.path_regex)) {
                // Extract path parameters
                std::map<std::string, std::string> path_params;
                for (size_t i = 0; i < route.param_names.size(); ++i) {
                    path_params[route.param_names[i]] = match[i + 1].str();
                }

                // 2. Authentication Middleware
                if (route.requires_auth) {
                    std::string auth_header = req[http::field::authorization].to_string();
                    try {
                        User user_ctx = authMiddleware.authenticate(auth_header, authService_);
                        req.base().insert("X-User-ID", std::to_string(user_ctx.id.value_or(0))); // Attach user info to request
                        req.base().insert("X-User-Role", user_ctx.role);

                        if (!route.required_role.empty() && user_ctx.role != route.required_role) {
                            send_response(createErrorResponse(http::status::forbidden, "Forbidden: Insufficient role"));
                            return;
                        }
                    } catch (const AuthException& e) {
                        send_response(createErrorResponse(http::status::unauthorized, e.what()));
                        return;
                    }
                }

                // 3. Execute Handler
                route.handler(req, send_response, std::move(path_params));
                return;
            }
        }

        // No route found
        send_response(createErrorResponse(http::status::not_found, "Not Found"));

    } catch (const CustomException& e) {
        LOG_ERROR("Caught CustomException: {}", e.what());
        send_response(errorHandler.handle(http::status::bad_request, e.what()));
    } catch (const nlohmann::json::exception& e) {
        LOG_ERROR("JSON Parsing Error: {}", e.what());
        send_response(errorHandler.handle(http::status::bad_request, "Invalid JSON payload"));
    } catch (const std::exception& e) {
        LOG_ERROR("Caught standard exception: {}", e.what());
        send_response(errorHandler.handle(http::status::internal_server_error, "Internal Server Error"));
    } catch (...) {
        LOG_ERROR("Caught unknown exception.");
        send_response(errorHandler.handle(http::status::internal_server_error, "Unknown Internal Server Error"));
    }
}

http::response<http::string_body> RequestHandler::createJsonResponse(
    http::status status, const json& body, unsigned int version) {
    http::response<http::string_body> res{status, version};
    res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
    res.set(http::field::content_type, "application/json");
    res.body() = body.dump(4); // Pretty print
    res.prepare_payload();
    return res;
}

http::response<http::string_body> RequestHandler::createHtmlResponse(
    http::status status, const std::string& body, unsigned int version) {
    http::response<http::string_body> res{status, version};
    res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
    res.set(http::field::content_type, "text/html");
    res.body() = body;
    res.prepare_payload();
    return res;
}

http::response<http::string_body> RequestHandler::createErrorResponse(
    http::status status, const std::string& message, unsigned int version) {
    json error_body;
    error_body["status"] = static_cast<int>(status);
    error_body["message"] = message;
    return createJsonResponse(status, error_body, version);
}

// --- Specific Endpoint Handlers ---

void RequestHandler::handleRoot(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    // A very simple "template" rendering. In a real app, use a proper templating engine.
    std::string html_content = ViewRenderer::render("index.html", {{"title", "Database Optimizer"}});
    send_response(createHtmlResponse(http::status::ok, html_content));
}

void RequestHandler::handleStaticFile(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    std::string filename = params["filename"];
    http::response<http::string_body> res = staticFileHandler.serveFile(filename, req.version());
    send_response(std::move(res));
}

void RequestHandler::handleLogin(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        json body = json::parse(req.body());
        std::string username = body.at("username");
        std::string password = body.at("password");

        std::optional<std::string> token = authService_.login(username, password, *userRepo_);
        if (token) {
            json response_body;
            response_body["token"] = *token;
            send_response(createJsonResponse(http::status::ok, response_body));
        } else {
            send_response(createErrorResponse(http::status::unauthorized, "Invalid credentials"));
        }
    } catch (const nlohmann::json::exception& e) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid JSON payload for login"));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Login failed: " + std::string(e.what())));
    }
}

void RequestHandler::handleRegister(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        json body = json::parse(req.body());
        User new_user = JsonUtils::fromJson<User>(body); // Assuming JsonUtils can deserialize User
        
        // Simple validation
        if (new_user.username.empty() || new_user.password_hash.empty() || new_user.email.empty()) {
            send_response(createErrorResponse(http::status::bad_request, "Missing required fields for registration."));
            return;
        }

        // Hash the password before saving (the model field is password_hash)
        new_user.password_hash = AuthService::hashPassword(new_user.password_hash); // Assuming password_hash field temporarily holds clear password
        new_user.role = "USER"; // Default role

        userRepo_->create(new_user);
        send_response(createJsonResponse(http::status::created, {{"message", "User registered successfully"}}));

    } catch (const nlohmann::json::exception& e) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid JSON payload: " + std::string(e.what())));
    } catch (const DbException& e) {
        if (std::string(e.what()).find("duplicate key") != std::string::npos) {
            send_response(createErrorResponse(http::status::conflict, "User with this username or email already exists."));
        } else {
            send_response(createErrorResponse(http::status::internal_server_error, "Database error during registration: " + std::string(e.what())));
        }
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Registration failed: " + std::string(e.what())));
    }
}

void RequestHandler::handleGetUsers(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        std::vector<User> users = userRepo_->findAll();
        json users_json = json::array();
        for (const auto& user : users) {
            users_json.push_back(JsonUtils::toJson(user)); // Assuming JsonUtils can serialize User
        }
        send_response(createJsonResponse(http::status::ok, users_json));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to fetch users: " + std::string(e.what())));
    }
}

void RequestHandler::handleGetUserById(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        int id = std::stoi(params["id"]);
        std::optional<User> user = userRepo_->findById(id);
        if (user) {
            send_response(createJsonResponse(http::status::ok, JsonUtils::toJson(*user)));
        } else {
            send_response(createErrorResponse(http::status::not_found, "User not found"));
        }
    } catch (const std::invalid_argument&) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid user ID format"));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to fetch user: " + std::string(e.what())));
    }
}

void RequestHandler::handleUpdateUser(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        int id = std::stoi(params["id"]);
        json body = json::parse(req.body());
        User updated_user = JsonUtils::fromJson<User>(body);
        updated_user.id = id; // Ensure ID is set from path

        if (userRepo_->update(updated_user)) {
            send_response(createJsonResponse(http::status::ok, {{"message", "User updated successfully"}}));
        } else {
            send_response(createErrorResponse(http::status::not_found, "User not found or no changes made"));
        }
    } catch (const std::invalid_argument&) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid user ID format"));
    } catch (const nlohmann::json::exception& e) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid JSON payload: " + std::string(e.what())));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to update user: " + std::string(e.what())));
    }
}

void RequestHandler::handleDeleteUser(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        int id = std::stoi(params["id"]);
        if (userRepo_->remove(id)) {
            send_response(createJsonResponse(http::status::ok, {{"message", "User deleted successfully"}}));
        } else {
            send_response(createErrorResponse(http::status::not_found, "User not found"));
        }
    } catch (const std::invalid_argument&) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid user ID format"));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to delete user: " + std::string(e.what())));
    }
}

// Optimization Recommendation Handlers (similar CRUD logic)
void RequestHandler::handleGetAllRecommendations(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        // Example of caching:
        std::string cache_key = "all_recommendations";
        if (cacheService_->has(cache_key)) {
            LOG_INFO("Serving recommendations from cache.");
            send_response(createJsonResponse(http::status::ok, cacheService_->get(cache_key)));
            return;
        }

        std::vector<IndexRecommendation> recs = indexRecRepo_->findAll();
        json recs_json = json::array();
        for (const auto& rec : recs) {
            recs_json.push_back(JsonUtils::toJson(rec));
        }
        cacheService_->set(cache_key, recs_json, std::chrono::minutes(5)); // Cache for 5 minutes
        send_response(createJsonResponse(http::status::ok, recs_json));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to fetch recommendations: " + std::string(e.what())));
    }
}

void RequestHandler::handleGetRecommendationById(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        int id = std::stoi(params["id"]);
        std::optional<IndexRecommendation> rec = indexRecRepo_->findById(id);
        if (rec) {
            send_response(createJsonResponse(http::status::ok, JsonUtils::toJson(*rec)));
        } else {
            send_response(createErrorResponse(http::status::not_found, "Recommendation not found"));
        }
    } catch (const std::invalid_argument&) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid recommendation ID format"));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to fetch recommendation: " + std::string(e.what())));
    }
}

void RequestHandler::handleCreateRecommendation(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        json body = json::parse(req.body());
        IndexRecommendation new_rec = JsonUtils::fromJson<IndexRecommendation>(body);
        new_rec.status = "PENDING"; // Default status

        indexRecRepo_->create(new_rec);
        cacheService_->invalidate("all_recommendations"); // Invalidate cache
        send_response(createJsonResponse(http::status::created, {{"message", "Recommendation created successfully"}}));
    } catch (const nlohmann::json::exception& e) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid JSON payload: " + std::string(e.what())));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to create recommendation: " + std::string(e.what())));
    }
}

void RequestHandler::handleUpdateRecommendation(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        int id = std::stoi(params["id"]);
        json body = json::parse(req.body());
        IndexRecommendation updated_rec = JsonUtils::fromJson<IndexRecommendation>(body);
        updated_rec.id = id;

        if (indexRecRepo_->update(updated_rec)) {
            cacheService_->invalidate("all_recommendations"); // Invalidate cache
            send_response(createJsonResponse(http::status::ok, {{"message", "Recommendation updated successfully"}}));
        } else {
            send_response(createErrorResponse(http::status::not_found, "Recommendation not found or no changes made"));
        }
    } catch (const std::invalid_argument&) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid recommendation ID format"));
    } catch (const nlohmann::json::exception& e) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid JSON payload: " + std::string(e.what())));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to update recommendation: " + std::string(e.what())));
    }
}

void RequestHandler::handleDeleteRecommendation(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        int id = std::stoi(params["id"]);
        if (indexRecRepo_->remove(id)) {
            cacheService_->invalidate("all_recommendations"); // Invalidate cache
            send_response(createJsonResponse(http::status::ok, {{"message", "Recommendation deleted successfully"}}));
        } else {
            send_response(createErrorResponse(http::status::not_found, "Recommendation not found"));
        }
    } catch (const std::invalid_argument&) {
        send_response(createErrorResponse(http::status::bad_request, "Invalid recommendation ID format"));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Failed to delete recommendation: " + std::string(e.what())));
    }
}

void RequestHandler::handleRunQueryAnalysis(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        // In a real system, this would trigger an async job or analyze a recent batch
        // For demonstration, we'll just acknowledge and simulate.
        queryAnalyzerService_->analyzeRecentQueries(100); // Analyze last 100 queries
        send_response(createJsonResponse(http::status::ok, {{"message", "Query analysis initiated. Check recommendations later."}}));
        cacheService_->invalidate("all_recommendations"); // New recs might be generated
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Query analysis failed: " + std::string(e.what())));
    }
}

void RequestHandler::handleRunSchemaAnalysis(const http::request<http::string_body>& req, std::function<void(http::response<http::string_body>&& res)> send_response, std::map<std::string, std::string>&& params) {
    try {
        // Similarly, this would analyze the current schema state
        schemaAnalyzerService_->analyzeSchemaForIssues();
        send_response(createJsonResponse(http::status::ok, {{"message", "Schema analysis initiated. Check schema issues later."}}));
    } catch (const std::exception& e) {
        send_response(createErrorResponse(http::status::internal_server_error, "Schema analysis failed: " + std::string(e.what())));
    }
}
```