```cpp
#include "ProjectController.hpp"

ProjectController::ProjectController(std::shared_ptr<ProjectService> project_service,
                                     std::shared_ptr<UserService> user_service)
    : project_service_(project_service), user_service_(user_service) {}

void ProjectController::registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app) {
    // Get all projects
    CROW_ROUTE(app, "/api/v1/projects")
        .methods(crow::HTTPMethod::GET)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx) {
        return try_catch_handler([&]() -> crow::response {
            std::vector<Project> projects = project_service_->getAllProjects();
            return crow::response(200, JSONConverter::toJSON(projects).dump());
        });
    });

    // Create a new project
    CROW_ROUTE(app, "/api/v1/projects")
        .methods(crow::HTTPMethod::POST)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx) {
        return try_catch_handler([&]() -> crow::response {
            nlohmann::json req_body = JSONConverter::parse(req.body);
            ProjectCreateDTO create_dto = ProjectCreateDTO::fromJson(req_body);

            // Authorization: If owner_id is specified and it's not the authenticated user,
            // only admins can set a different owner.
            if (create_dto.owner_id.has_value() && create_dto.owner_id.value() != ctx.user_id) {
                if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN)) {
                    throw ForbiddenException("Access denied: Only administrators can create projects for other users.");
                }
                // Also validate that the specified owner_id actually exists
                if (!user_service_->getUserById(create_dto.owner_id.value()).has_value()) {
                    throw BadRequestException("Owner user with ID " + std::to_string(create_dto.owner_id.value()) + " does not exist.");
                }
            }
            
            // If owner_id not provided, the current user is the owner
            if (!create_dto.owner_id.has_value()) {
                create_dto.owner_id = ctx.user_id;
            }

            Project new_project = project_service_->createProject(create_dto, ctx.user_id); // Pass auth user ID for implicit ownership
            return crow::response(201, JSONConverter::toJSON(new_project).dump());
        });
    });

    // Get project by ID
    CROW_ROUTE(app, "/api/v1/projects/<int>")
        .methods(crow::HTTPMethod::GET)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int project_id) {
        return try_catch_handler([&]() -> crow::response {
            std::optional<Project> project = project_service_->getProjectById(project_id);
            if (!project.has_value()) {
                throw NotFoundException("Project with ID " + std::to_string(project_id) + " not found.");
            }
            // Authorization: Only owner or admin can view project details (or public projects if applicable)
            // For now, assume all projects are viewable by any authenticated user for simplicity,
            // but add a check for modification/deletion.
            return crow::response(200, JSONConverter::toJSON(project.value()).dump());
        });
    });

    // Update project by ID
    CROW_ROUTE(app, "/api/v1/projects/<int>")
        .methods(crow::HTTPMethod::PUT)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int project_id) {
        return try_catch_handler([&]() -> crow::response {
            // Authorization: Only project owner or admin can update
            if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN) && !project_service_->isProjectOwner(project_id, ctx.user_id)) {
                throw ForbiddenException("Access denied: Not authorized to update this project.");
            }

            nlohmann::json req_body = JSONConverter::parse(req.body);
            ProjectUpdateDTO update_dto = ProjectUpdateDTO::fromJson(req_body);

            // If `owner_id` is updated, ensure only admin can do it, and the new owner exists.
            if (update_dto.owner_id.has_value()) {
                if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN)) {
                    throw ForbiddenException("Access denied: Only administrators can change project ownership.");
                }
                if (update_dto.owner_id.value() != 0 && !user_service_->getUserById(update_dto.owner_id.value()).has_value()) {
                    throw BadRequestException("New owner user with ID " + std::to_string(update_dto.owner_id.value()) + " does not exist.");
                }
            } else if (req_body.contains("owner_id") && req_body["owner_id"].is_null()) { // Explicit null
                if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN)) {
                    throw ForbiddenException("Access denied: Only administrators can remove project ownership.");
                }
            }

            Project updated_project = project_service_->updateProject(project_id, update_dto);
            return crow::response(200, JSONConverter::toJSON(updated_project).dump());
        });
    });

    // Delete project by ID
    CROW_ROUTE(app, "/api/v1/projects/<int>")
        .methods(crow::HTTPMethod::DELETE)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int project_id) {
        return try_catch_handler([&]() -> crow::response {
            // Authorization: Only project owner or admin can delete
            if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN) && !project_service_->isProjectOwner(project_id, ctx.user_id)) {
                throw ForbiddenException("Access denied: Not authorized to delete this project.");
            }

            project_service_->deleteProject(project_id);
            return crow::response(204); // No content
        });
    });
}
```