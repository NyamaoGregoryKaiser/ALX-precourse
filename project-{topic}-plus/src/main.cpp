#include <iostream>
#include <string>
#include <stdexcept>
#include <crow.h>
#include <nlohmann/json.hpp>

#include "config/config.h"
#include "database/db_manager.h"
#include "utils/logger.h"
#include "utils/jwt_manager.h"
#include "middleware/auth_middleware.h"

#include "services/user_service.h"
#include "services/project_service.h"
#include "services/task_service.h"
#include "services/team_service.h"

int main() {
    try {
        // 1. Load Configuration
        Config::AppConfig app_config = Config::loadAppConfig();
        Config::DatabaseConfig db_config = Config::loadDatabaseConfig();
        Config::JwtConfig jwt_config = Config::loadJwtConfig();

        // 2. Initialize Logger
        Logger::init(app_config.log_level);
        Logger::info("Application starting in {} environment on port {}", app_config.app_env, app_config.app_port);

        // 3. Initialize Database Manager
        std::string db_connection_string = fmt::format(
            "host={} port={} dbname={} user={} password={}",
            db_config.db_host, db_config.db_port, db_config.db_name, db_config.db_user, db_config.db_password
        );
        DbManager& db_manager = DbManager::getInstance(db_connection_string);

        // 4. Initialize JWT Manager
        JwtManager jwt_manager(jwt_config.jwt_secret, jwt_config.jwt_expiration_seconds);

        // 5. Initialize Services
        UserService user_service(db_manager, jwt_manager);
        ProjectService project_service(db_manager);
        TaskService task_service(db_manager);
        TeamService team_service(db_manager);

        // 6. Setup Crow Application
        crow::App<AuthMiddleware> app;
        app.loglevel(crow::LogLevel::Info); // Crow's internal logging
        
        // Use custom log handler for Crow to integrate with spdlog
        app.set_logger_handler(
            [](crow::LogLevel level, const crow::LogContext& ctx, const std::string& msg) {
                // Map Crow's log levels to spdlog's
                switch (level) {
                    case crow::LogLevel::Debug: Logger::debug("[Crow] {}:{}: {}", ctx.filename, ctx.line, msg); break;
                    case crow::LogLevel::Info:  Logger::info("[Crow] {}:{}: {}", ctx.filename, ctx.line, msg);  break;
                    case crow::LogLevel::Warning: Logger::warn("[Crow] {}:{}: {}", ctx.filename, ctx.line, msg); break;
                    case crow::LogLevel::Error: Logger::error("[Crow] {}:{}: {}", ctx.filename, ctx.line, msg); break;
                    case crow::LogLevel::Critical: Logger::critical("[Crow] {}:{}: {}", ctx.filename, ctx.line, msg); break;
                    case crow::LogLevel::None: break;
                }
            }
        );

        // Configure Crow middleware instances
        AuthMiddleware auth_middleware_instance(jwt_manager);
        app.middleware(auth_middleware_instance);

        // Global Error Handling Middleware (conceptually, Crow handles exceptions in routes)
        app.route("/<path>")
            .methods("GET"_method, "POST"_method, "PUT"_method, "DELETE"_method, "PATCH"_method, "OPTIONS"_method)
            ([](const crow::request& req, crow::response& res) {
                // This route will catch requests not handled by more specific routes.
                // It also serves as a generic error handler for unexpected paths.
                if (req.method == "OPTIONS") {
                    // Handle CORS preflight requests
                    res.set_header("Access-Control-Allow-Origin", "*");
                    res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
                    res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
                    res.set_header("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours
                    res.code = 204; // No Content
                    return;
                }
                // Handle routes that don't match, e.g., 404
                if (res.code == 0) { // If no other route set a code
                     res.code = 404;
                     res.set_header("Content-Type", "application/json");
                     res.write("{\"message\": \"Not Found: " + req.url + "\"}");
                }
            });


        // Define API Endpoints

        // --- User Authentication & Management ---

        CROW_ROUTE(app, "/auth/register")
            .methods("POST"_method)
            ([](const crow::request& req) {
                crow::response res;
                res.set_header("Content-Type", "application/json");
                try {
                    auto json_body = nlohmann::json::parse(req.body);
                    User new_user;
                    from_json(json_body, new_user);

                    if (new_user.username.empty() || new_user.email.empty() || new_user.password_hash.empty()) {
                        res.code = 400;
                        res.write("{\"message\": \"Username, email, and password are required.\"}");
                        return res;
                    }

                    user_service.createUser(new_user);
                    res.code = 201;
                    res.write("{\"message\": \"User registered successfully.\" , \"user_id\": \"" + new_user.id + "\"}");
                } catch (const UserAlreadyExistsException& e) {
                    res.code = 409; // Conflict
                    res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                } catch (const std::invalid_argument& e) {
                    res.code = 400;
                    res.write(fmt::format("{{\"message\": \"Bad Request: {}\"}}", e.what()));
                } catch (const nlohmann::json::exception& e) {
                    Logger::error("JSON parsing error: {}", e.what());
                    res.code = 400;
                    res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                } catch (const std::exception& e) {
                    Logger::error("Error registering user: {}", e.what());
                    res.code = 500;
                    res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                }
                return res;
            });

        CROW_ROUTE(app, "/auth/login")
            .methods("POST"_method)
            ([](const crow::request& req) {
                crow::response res;
                res.set_header("Content-Type", "application/json");
                try {
                    auto json_body = nlohmann::json::parse(req.body);
                    std::string email = json_body.at("email").get<std::string>();
                    std::string password = json_body.at("password").get<std::string>();

                    if (email.empty() || password.empty()) {
                        res.code = 400;
                        res.write("{\"message\": \"Email and password are required.\"}");
                        return res;
                    }

                    std::string token = user_service.authenticateUser(email, password);
                    res.code = 200;
                    res.write(fmt::format("{{\"message\": \"Login successful.\", \"token\": \"{}\"}}", token));
                } catch (const InvalidCredentialsException& e) {
                    res.code = 401; // Unauthorized
                    res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                } catch (const nlohmann::json::exception& e) {
                    Logger::error("JSON parsing/access error: {}", e.what());
                    res.code = 400;
                    res.write(fmt::format("{{\"message\": \"Invalid JSON or missing fields: {}\"}}", e.what()));
                } catch (const std::exception& e) {
                    Logger::error("Error logging in user: {}", e.what());
                    res.code = 500;
                    res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                }
                return res;
            });

        CROW_ROUTE(app, "/users/me")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method)
            ([](const crow::request& req, AuthMiddleware::context& ctx) {
                crow::response res;
                res.set_header("Content-Type", "application/json");
                if (!ctx.is_authenticated) { // Should be caught by middleware, but good to double check
                    res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res;
                }
                try {
                    auto user_opt = user_service.getUserById(ctx.auth_context.user_id);
                    if (user_opt) {
                        res.code = 200;
                        res.write(nlohmann::json(user_opt.value()).dump());
                    } else {
                        res.code = 404;
                        res.write("{\"message\": \"User not found.\"}");
                    }
                } catch (const std::exception& e) {
                    Logger::error("Error getting user profile: {}", e.what());
                    res.code = 500;
                    res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                }
                return res;
            });

        CROW_ROUTE(app, "/users/<string>")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "PUT"_method, "DELETE"_method)
            ([&user_service](const crow::request& req, AuthMiddleware::context& ctx, std::string user_id) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) {
                    res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res;
                }

                // Authorization: A user can only access/modify their own profile
                if (ctx.auth_context.user_id != user_id) {
                    res.code = 403; // Forbidden
                    res.write("{\"message\": \"Forbidden: You can only access or modify your own user data.\"}");
                    return res;
                }

                if (req.method == "GET"_method) {
                    try {
                        auto user_opt = user_service.getUserById(user_id);
                        if (user_opt) {
                            res.code = 200;
                            res.write(nlohmann::json(user_opt.value()).dump());
                        } else {
                            res.code = 404;
                            res.write("{\"message\": \"User not found.\"}");
                        }
                    } catch (const std::exception& e) {
                        Logger::error("Error getting user {}: {}", user_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "PUT"_method) {
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        User user_updates;
                        from_json(json_body, user_updates); // Populates username, email, password_hash

                        User updated_user = user_service.updateUser(user_id, user_updates);
                        res.code = 200;
                        res.write(nlohmann::json(updated_user).dump());
                    } catch (const UserNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const std::invalid_argument& e) {
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Bad Request: {}\"}}", e.what()));
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error updating user {}: {}", user_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "DELETE"_method) {
                    try {
                        user_service.deleteUser(user_id);
                        res.code = 204; // No Content
                    } catch (const UserNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error deleting user {}: {}", user_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });


        // --- Project Management ---

        CROW_ROUTE(app, "/projects")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "POST"_method)
            ([&project_service](const crow::request& req, AuthMiddleware::context& ctx) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }

                if (req.method == "GET"_method) {
                    try {
                        // In a real app, GET /projects might list projects visible to the user
                        // For now, let's get projects where the user is an owner or member
                        std::vector<Project> projects = project_service.getProjectsByUser(ctx.auth_context.user_id);
                        res.code = 200;
                        res.write(nlohmann::json(projects).dump());
                    } catch (const std::exception& e) {
                        Logger::error("Error getting all projects for user {}: {}", ctx.auth_context.user_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "POST"_method) {
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        Project new_project;
                        from_json(json_body, new_project);

                        if (new_project.name.empty()) {
                            res.code = 400;
                            res.write("{\"message\": \"Project name is required.\"}");
                            return res;
                        }
                        // Set the owner to the authenticated user
                        new_project.owner_id = ctx.auth_context.user_id;

                        Project created_project = project_service.createProject(new_project, ctx.auth_context.user_id);
                        res.code = 201;
                        res.write(nlohmann::json(created_project).dump());
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error creating project: {}", e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });

        CROW_ROUTE(app, "/projects/<string>")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "PUT"_method, "DELETE"_method)
            ([&project_service](const crow::request& req, AuthMiddleware::context& ctx, std::string project_id) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }

                // Authorization check: User must be a member or owner of the project
                if (!project_service.isUserProjectMember(project_id, ctx.auth_context.user_id)) {
                    res.code = 403; // Forbidden
                    res.write("{\"message\": \"Forbidden: You are not a member of this project.\"}");
                    return res;
                }

                if (req.method == "GET"_method) {
                    try {
                        auto project_opt = project_service.getProjectById(project_id);
                        if (project_opt) {
                            res.code = 200;
                            res.write(nlohmann::json(project_opt.value()).dump());
                        } else {
                            res.code = 404;
                            res.write("{\"message\": \"Project not found.\"}");
                        }
                    } catch (const std::exception& e) {
                        Logger::error("Error getting project {}: {}", project_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "PUT"_method) {
                    // Authorization: Only project owner or admin can update project details
                    if (!project_service.isUserProjectOwner(project_id, ctx.auth_context.user_id)) {
                        res.code = 403;
                        res.write("{\"message\": \"Forbidden: Only the project owner can update project details.\"}");
                        return res;
                    }
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        Project project_updates;
                        from_json(json_body, project_updates);

                        Project updated_project = project_service.updateProject(project_id, project_updates);
                        res.code = 200;
                        res.write(nlohmann::json(updated_project).dump());
                    } catch (const ProjectNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error updating project {}: {}", project_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "DELETE"_method) {
                    // Authorization: Only project owner can delete a project
                    if (!project_service.isUserProjectOwner(project_id, ctx.auth_context.user_id)) {
                        res.code = 403;
                        res.write("{\"message\": \"Forbidden: Only the project owner can delete a project.\"}");
                        return res;
                    }
                    try {
                        project_service.deleteProject(project_id);
                        res.code = 204; // No Content
                    } catch (const ProjectNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error deleting project {}: {}", project_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });

        // --- Task Management ---

        CROW_ROUTE(app, "/projects/<string>/tasks")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "POST"_method)
            ([&project_service, &task_service](const crow::request& req, AuthMiddleware::context& ctx, std::string project_id) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }

                // Authorization check: User must be a member of the project
                if (!project_service.isUserProjectMember(project_id, ctx.auth_context.user_id)) {
                    res.code = 403;
                    res.write("{\"message\": \"Forbidden: You are not a member of this project.\"}");
                    return res;
                }

                if (req.method == "GET"_method) {
                    try {
                        std::vector<Task> tasks = task_service.getTasksByProjectId(project_id);
                        res.code = 200;
                        res.write(nlohmann::json(tasks).dump());
                    } catch (const std::exception& e) {
                        Logger::error("Error getting tasks for project {}: {}", project_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "POST"_method) {
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        Task new_task;
                        from_json(json_body, new_task);

                        if (new_task.title.empty()) {
                            res.code = 400;
                            res.write("{\"message\": \"Task title is required.\"}");
                            return res;
                        }
                        new_task.project_id = project_id; // Ensure task is linked to this project

                        Task created_task = task_service.createTask(new_task);
                        res.code = 201;
                        res.write(nlohmann::json(created_task).dump());
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error creating task for project {}: {}", project_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });

        CROW_ROUTE(app, "/projects/<string>/tasks/<string>")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "PUT"_method, "DELETE"_method)
            ([&project_service, &task_service](const crow::request& req, AuthMiddleware::context& ctx, std::string project_id, std::string task_id) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }

                // Authorization check: User must be a member of the project
                if (!project_service.isUserProjectMember(project_id, ctx.auth_context.user_id)) {
                    res.code = 403;
                    res.write("{\"message\": \"Forbidden: You are not a member of this project.\"}");
                    return res;
                }

                // Additional check: Ensure task belongs to the specified project
                auto task_opt = task_service.getTaskById(task_id);
                if (!task_opt || task_opt->project_id != project_id) {
                    res.code = 404;
                    res.write("{\"message\": \"Task not found in this project.\"}");
                    return res;
                }

                if (req.method == "GET"_method) {
                    try {
                        res.code = 200;
                        res.write(nlohmann::json(task_opt.value()).dump());
                    } catch (const std::exception& e) { // Should not happen after initial check
                        Logger::error("Error getting task {}: {}", task_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "PUT"_method) {
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        Task task_updates;
                        from_json(json_body, task_updates);

                        Task updated_task = task_service.updateTask(task_id, task_updates);
                        res.code = 200;
                        res.write(nlohmann::json(updated_task).dump());
                    } catch (const TaskNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error updating task {}: {}", task_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "DELETE"_method) {
                    // Authorization: Only project owner or task assignee can delete/modify tasks?
                    // For simplicity, let any project member delete for now.
                    // A more robust system would check project_service.getRoleForUser(project_id, ctx.auth_context.user_id)
                    try {
                        task_service.deleteTask(task_id);
                        res.code = 204; // No Content
                    } catch (const TaskNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error deleting task {}: {}", task_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });
        
        // --- Team Management ---

        CROW_ROUTE(app, "/teams")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "POST"_method)
            ([&team_service](const crow::request& req, AuthMiddleware::context& ctx) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }

                if (req.method == "GET"_method) {
                    try {
                        std::vector<Team> teams = team_service.getAllTeams();
                        res.code = 200;
                        res.write(nlohmann::json(teams).dump());
                    } catch (const std::exception& e) {
                        Logger::error("Error getting all teams: {}", e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "POST"_method) {
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        Team new_team;
                        from_json(json_body, new_team);

                        if (new_team.name.empty()) {
                            res.code = 400;
                            res.write("{\"message\": \"Team name is required.\"}");
                            return res;
                        }

                        Team created_team = team_service.createTeam(new_team);
                        res.code = 201;
                        res.write(nlohmann::json(created_team).dump());
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error creating team: {}", e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });

        CROW_ROUTE(app, "/teams/<string>")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "PUT"_method, "DELETE"_method)
            ([&team_service](const crow::request& req, AuthMiddleware::context& ctx, std::string team_id) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }

                // Authorization: For simplicity, assume only members can view, and only specific roles can update/delete
                if (!team_service.isUserTeamMember(team_id, ctx.auth_context.user_id)) {
                    // For GET, we might allow non-members to view public team info, but for this example, require membership.
                    res.code = 403;
                    res.write("{\"message\": \"Forbidden: You are not a member of this team.\"}");
                    return res;
                }

                if (req.method == "GET"_method) {
                    try {
                        auto team_opt = team_service.getTeamById(team_id);
                        if (team_opt) {
                            res.code = 200;
                            res.write(nlohmann::json(team_opt.value()).dump());
                        } else {
                            res.code = 404;
                            res.write("{\"message\": \"Team not found.\"}");
                        }
                    } catch (const std::exception& e) {
                        Logger::error("Error getting team {}: {}", team_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "PUT"_method) {
                    // Authorization: Assume only an admin/owner of the team can update
                    // For demo, we'll allow any team member with this simplified check.
                    // In real-world, differentiate roles: project_service.getUserRoleInTeam(team_id, user_id)
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        Team team_updates;
                        from_json(json_body, team_updates);

                        Team updated_team = team_service.updateTeam(team_id, team_updates);
                        res.code = 200;
                        res.write(nlohmann::json(updated_team).dump());
                    } catch (const TeamNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON in request body: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error updating team {}: {}", team_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "DELETE"_method) {
                    // Authorization: Assume only an admin/owner of the team can delete
                    // For demo, we'll allow any team member with this simplified check.
                    try {
                        team_service.deleteTeam(team_id);
                        res.code = 204; // No Content
                    } catch (const TeamNotFoundException& e) {
                        res.code = 404;
                        res.write(fmt::format("{{\"message\": \"{}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error deleting team {}: {}", team_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });
        
        CROW_ROUTE(app, "/teams/<string>/members")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("GET"_method, "POST"_method)
            ([&team_service](const crow::request& req, AuthMiddleware::context& ctx, std::string team_id) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }
                if (!team_service.isUserTeamMember(team_id, ctx.auth_context.user_id)) {
                    res.code = 403; res.write("{\"message\": \"Forbidden\"}"); return res;
                }

                if (req.method == "GET"_method) {
                    try {
                        std::vector<std::string> members = team_service.getTeamMembers(team_id);
                        res.code = 200;
                        res.write(nlohmann::json(members).dump());
                    } catch (const std::exception& e) {
                        Logger::error("Error getting team {} members: {}", team_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                } else if (req.method == "POST"_method) {
                    try {
                        auto json_body = nlohmann::json::parse(req.body);
                        std::string user_to_add_id = json_body.at("user_id").get<std::string>();
                        
                        // Authorization: A user cannot add themselves to a team unless they are already a member
                        // Or, more strictly, only team owner/admin can add members.
                        // For simplicity, allow any team member to add for demo
                        team_service.addMemberToTeam(team_id, user_to_add_id);
                        res.code = 200;
                        res.write(fmt::format("{{\"message\": \"User {} added to team {}\"}}", user_to_add_id, team_id));
                    } catch (const nlohmann::json::exception& e) {
                        Logger::error("JSON parsing error: {}", e.what());
                        res.code = 400;
                        res.write(fmt::format("{{\"message\": \"Invalid JSON or missing fields: {}\"}}", e.what()));
                    } catch (const std::exception& e) {
                        Logger::error("Error adding member to team {}: {}", team_id, e.what());
                        res.code = 500;
                        res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                    }
                }
                return res;
            });

        CROW_ROUTE(app, "/teams/<string>/members/<string>")
            .middleware(app.get_middleware<AuthMiddleware>())
            .methods("DELETE"_method)
            ([&team_service](const crow::request& req, AuthMiddleware::context& ctx, std::string team_id, std::string user_id_to_remove) {
                crow::response res;
                res.set_header("Content-Type", "application/json");

                if (!ctx.is_authenticated) { res.code = 401; res.write("{\"message\": \"Unauthorized\"}"); return res; }
                if (!team_service.isUserTeamMember(team_id, ctx.auth_context.user_id)) {
                    res.code = 403; res.write("{\"message\": \"Forbidden\"}"); return res;
                }

                // Authorization: Only team admin/owner can remove other members.
                // A user can remove themselves.
                // For demo, allow any team member to remove for now.
                try {
                    team_service.removeMemberFromTeam(team_id, user_id_to_remove);
                    res.code = 204; // No Content
                } catch (const std::exception& e) {
                    Logger::error("Error removing member {} from team {}: {}", user_id_to_remove, team_id, e.what());
                    res.code = 500;
                    res.write(fmt::format("{{\"message\": \"Internal server error: {}\"}}", e.what()));
                }
                return res;
            });

        // 7. Start Crow Application
        Logger::info("API Server listening on port {}", app_config.app_port);
        app.port(app_config.app_port).multithreaded().run();

    } catch (const std::runtime_error& e) {
        // Catch critical errors during startup (config, DB init, etc.)
        Logger::critical("FATAL: Application startup failed: {}", e.what());
        return 1;
    } catch (const std::exception& e) {
        Logger::critical("FATAL: Unhandled exception during application startup: {}", e.what());
        return 1;
    } catch (...) {
        Logger::critical("FATAL: Unknown unhandled exception during application startup.");
        return 1;
    }

    return 0;
}
```