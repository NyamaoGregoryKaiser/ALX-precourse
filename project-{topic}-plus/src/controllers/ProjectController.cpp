```cpp
#include "ProjectController.h"

namespace TaskManager {
namespace Controllers {

ProjectController::ProjectController(Services::ProjectService& project_service, Services::UserService& user_service)
    : project_service_(project_service), user_service_(user_service) {}

void ProjectController::setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app) {
    // Create new project
    CROW_ROUTE(app, "/projects")
        .methods("POST"_method)
        ([this](const crow::request& req, Middleware::AuthMiddleware::context& ctx) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received POST /projects request from user ID: {}", ctx.user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            auto json_body = nlohmann::json::parse(req.body);
            if (!json_body.contains("name")) {
                throw Exceptions::BadRequestException("Project name is required.");
            }

            Models::Project new_project = Models::Project::fromJson(json_body);
            new_project.owner_id = ctx.user_id; // Owner is the authenticated user

            Models::Project created_project = project_service_.createProject(new_project);

            crow::response res(crow::status::CREATED);
            res.set_header("Content-Type", "application/json");
            res.write(created_project.toJson().dump());
            logger->info("Project '{}' created by user ID: {}", created_project.name, ctx.user_id);
            return res;
        });

    // Get all projects (Admin can see all, regular user sees their own)
    CROW_ROUTE(app, "/projects")
        .methods("GET"_method)
        ([this](const crow::request& req, Middleware::AuthMiddleware::context& ctx) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received GET /projects request from user ID: {}", ctx.user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            int limit = req.url_params.get("limit") ? std::stoi(req.url_params.get("limit")) : 100;
            int offset = req.url_params.get("offset") ? std::stoi(req.url_params.get("offset")) : 0;

            std::vector<Models::Project> projects;
            if (ctx.is_admin) {
                projects = project_service_.getAllProjects(limit, offset);
                logger->info("Admin fetched {} projects.", projects.size());
            } else {
                projects = project_service_.getProjectsByOwner(ctx.user_id, limit, offset);
                logger->info("User ID {} fetched {} projects (owned).", ctx.user_id, projects.size());
            }
            
            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& project : projects) {
                response_json.push_back(project.toJson());
            }

            crow::response res(crow::status::OK);
            res.set_header("Content-Type", "application/json");
            res.write(response_json.dump());
            return res;
        });

    // Get project by ID
    CROW_ROUTE(app, "/projects/<int>")
        .methods("GET"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int project_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received GET /projects/{} request.", project_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            std::optional<Models::Project> project = project_service_.getProjectById(project_id);
            if (!project) {
                throw Exceptions::NotFoundException("Project not found with ID: " + std::to_string(project_id));
            }

            // Authorization: Admin or project owner
            if (!ctx.is_admin && !user_service_.isOwner(ctx.user_id, project->owner_id)) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to view this project.");
            }

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(project->toJson().dump());
            logger->info("Fetched project ID: {} for user ID: {}", project_id, ctx.user_id);
            return res;
        });

    // Update project by ID
    CROW_ROUTE(app, "/projects/<int>")
        .methods("PUT"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int project_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received PUT /projects/{} request.", project_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            std::optional<Models::Project> existing_project = project_service_.getProjectById(project_id);
            if (!existing_project) {
                throw Exceptions::NotFoundException("Project not found with ID: " + std::to_string(project_id));
            }

            // Authorization: Admin or project owner
            if (!ctx.is_admin && !user_service_.isOwner(ctx.user_id, existing_project->owner_id)) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to update this project.");
            }

            auto json_body = nlohmann::json::parse(req.body);
            Models::Project project_updates = Models::Project::fromJson(json_body);
            
            // Prevent non-admins from changing owner_id
            if (!ctx.is_admin && json_body.contains("owner_id")) {
                if (project_updates.owner_id != existing_project->owner_id) {
                    throw Exceptions::ForbiddenException("Only administrators can change project ownership.");
                }
            }
            // If owner_id is not provided in updates, it should default to the existing owner_id
            if (project_updates.owner_id == 0) { // fromJson would set it to 0 if not present
                project_updates.owner_id = existing_project->owner_id;
            }

            Models::Project updated_project = project_service_.updateProject(project_id, project_updates);

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(updated_project.toJson().dump());
            logger->info("Updated project ID: {} by user ID: {}", project_id, ctx.user_id);
            return res;
        });

    // Delete project by ID
    CROW_ROUTE(app, "/projects/<int>")
        .methods("DELETE"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int project_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received DELETE /projects/{} request.", project_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            std::optional<Models::Project> existing_project = project_service_.getProjectById(project_id);
            if (!existing_project) {
                throw Exceptions::NotFoundException("Project not found with ID: " + std::to_string(project_id));
            }

            // Authorization: Admin or project owner
            if (!ctx.is_admin && !user_service_.isOwner(ctx.user_id, existing_project->owner_id)) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to delete this project.");
            }

            project_service_.deleteProject(project_id);

            res.code = crow::status::NO_CONTENT;
            res.end();
            logger->info("Deleted project ID: {} by user ID: {}", project_id, ctx.user_id);
            return res;
        });
}

} // namespace Controllers
} // namespace TaskManager
```