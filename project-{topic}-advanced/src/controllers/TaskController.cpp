```cpp
#include "TaskController.hpp"

TaskController::TaskController(std::shared_ptr<TaskService> task_service,
                               std::shared_ptr<ProjectService> project_service,
                               std::shared_ptr<UserService> user_service)
    : task_service_(task_service), project_service_(project_service), user_service_(user_service) {}

// Helper function for authorization logic (can be moved to a more general auth helper)
bool TaskController::canManageProjectTasks(const AuthContext& ctx, int project_id) {
    if (AuthMiddleware::hasRole(ctx, UserRole::ADMIN)) {
        return true; // Admin can manage any project's tasks
    }
    // Check if the authenticated user is the owner of the project
    return project_service_->isProjectOwner(project_id, ctx.user_id);
}


void TaskController::registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app) {
    // Get all tasks (Admin only, or all tasks for owned projects?)
    // For simplicity, let's allow any authenticated user to see all tasks for now, but restrict to admin or project owner for CRUD.
    CROW_ROUTE(app, "/api/v1/tasks")
        .methods(crow::HTTPMethod::GET)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx) {
        return try_catch_handler([&]() -> crow::response {
            // For now, allow any authenticated user to view all tasks.
            // In a real app, you'd filter by projects they are involved in.
            std::vector<Task> tasks = task_service_->getAllTasks();
            return crow::response(200, JSONConverter::toJSON(tasks).dump());
        });
    });
    
    // Get tasks by project ID
    CROW_ROUTE(app, "/api/v1/projects/<int>/tasks")
        .methods(crow::HTTPMethod::GET)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int project_id) {
        return try_catch_handler([&]() -> crow::response {
            // Check if project exists
            if (!project_service_->getProjectById(project_id).has_value()) {
                throw NotFoundException("Project with ID " + std::to_string(project_id) + " not found.");
            }
            std::vector<Task> tasks = task_service_->getTasksByProjectId(project_id);
            return crow::response(200, JSONConverter::toJSON(tasks).dump());
        });
    });

    // Create a new task for a specific project
    CROW_ROUTE(app, "/api/v1/projects/<int>/tasks")
        .methods(crow::HTTPMethod::POST)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int project_id) {
        return try_catch_handler([&]() -> crow::response {
            // Authorization: Only project owner or admin can create tasks in a project
            if (!canManageProjectTasks(ctx, project_id)) {
                throw ForbiddenException("Access denied: Not authorized to create tasks in this project.");
            }

            nlohmann::json req_body = JSONConverter::parse(req.body);
            TaskCreateDTO create_dto = TaskCreateDTO::fromJson(req_body);
            create_dto.project_id = project_id; // Set project_id from URL parameter

            // If assigned_user_id is provided, validate it exists
            if (create_dto.assigned_user_id.has_value() && !user_service_->getUserById(create_dto.assigned_user_id.value()).has_value()) {
                throw BadRequestException("Assigned user with ID " + std::to_string(create_dto.assigned_user_id.value()) + " does not exist.");
            }

            Task new_task = task_service_->createTask(create_dto);
            return crow::response(201, JSONConverter::toJSON(new_task).dump());
        });
    });

    // Get task by ID
    CROW_ROUTE(app, "/api/v1/tasks/<int>")
        .methods(crow::HTTPMethod::GET)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int task_id) {
        return try_catch_handler([&]() -> crow::response {
            std::optional<Task> task = task_service_->getTaskById(task_id);
            if (!task.has_value()) {
                throw NotFoundException("Task with ID " + std::to_string(task_id) + " not found.");
            }
            // Authorization: Any authenticated user can view tasks. For stricter access,
            // check if user is owner of task's project or assigned to the task.
            return crow::response(200, JSONConverter::toJSON(task.value()).dump());
        });
    });

    // Update task by ID
    CROW_ROUTE(app, "/api/v1/tasks/<int>")
        .methods(crow::HTTPMethod::PUT)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int task_id) {
        return try_catch_handler([&]() -> crow::response {
            std::optional<Task> existing_task_opt = task_service_->getTaskById(task_id);
            if (!existing_task_opt.has_value()) {
                throw NotFoundException("Task with ID " + std::to_string(task_id) + " not found.");
            }
            
            // Authorization: Only project owner or admin can update tasks
            if (!canManageProjectTasks(ctx, existing_task_opt->project_id)) {
                throw ForbiddenException("Access denied: Not authorized to update tasks in this project.");
            }

            nlohmann::json req_body = JSONConverter::parse(req.body);
            TaskUpdateDTO update_dto = TaskUpdateDTO::fromJson(req_body);

            // If assigned_user_id is updated, validate it exists
            if (update_dto.assigned_user_id.has_value() && update_dto.assigned_user_id.value() != 0) {
                if (!user_service_->getUserById(update_dto.assigned_user_id.value()).has_value()) {
                    throw BadRequestException("Assigned user with ID " + std::to_string(update_dto.assigned_user_id.value()) + " does not exist.");
                }
            }
            // If project_id is updated, ensure the user has rights to the new project as well
            if (update_dto.project_id.has_value() && update_dto.project_id.value() != existing_task_opt->project_id) {
                if (!canManageProjectTasks(ctx, update_dto.project_id.value())) {
                     throw ForbiddenException("Access denied: Not authorized to move task to the target project.");
                }
            }


            Task updated_task = task_service_->updateTask(task_id, update_dto);
            return crow::response(200, JSONConverter::toJSON(updated_task).dump());
        });
    });

    // Delete task by ID
    CROW_ROUTE(app, "/api/v1/tasks/<int>")
        .methods(crow::HTTPMethod::DELETE)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int task_id) {
        return try_catch_handler([&]() -> crow::response {
            std::optional<Task> existing_task_opt = task_service_->getTaskById(task_id);
            if (!existing_task_opt.has_value()) {
                throw NotFoundException("Task with ID " + std::to_string(task_id) + " not found.");
            }

            // Authorization: Only project owner or admin can delete tasks
            if (!canManageProjectTasks(ctx, existing_task_opt->project_id)) {
                throw ForbiddenException("Access denied: Not authorized to delete tasks in this project.");
            }

            task_service_->deleteTask(task_id);
            return crow::response(204); // No content
        });
    });
}
```