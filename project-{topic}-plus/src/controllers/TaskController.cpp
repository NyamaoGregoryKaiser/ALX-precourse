```cpp
#include "TaskController.h"

namespace TaskManager {
namespace Controllers {

TaskController::TaskController(Services::TaskService& task_service, Services::ProjectService& project_service, Services::UserService& user_service)
    : task_service_(task_service), project_service_(project_service), user_service_(user_service) {}

bool TaskController::hasProjectAccess(long long user_id, long long project_id) {
    std::optional<Models::Project> project = project_service_.getProjectById(project_id);
    if (!project) {
        throw Exceptions::NotFoundException("Project not found with ID: " + std::to_string(project_id));
    }
    // Users can access tasks within projects they own
    return user_id == project->owner_id;
}


void TaskController::setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app) {
    // Create new task
    CROW_ROUTE(app, "/tasks")
        .methods("POST"_method)
        ([this](const crow::request& req, Middleware::AuthMiddleware::context& ctx) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received POST /tasks request from user ID: {}", ctx.user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            auto json_body = nlohmann::json::parse(req.body);
            if (!json_body.contains("title") || !json_body.contains("project_id")) {
                throw Exceptions::BadRequestException("Task title and project_id are required.");
            }

            Models::Task new_task = Models::Task::fromJson(json_body);

            // Authorization: User must have access to the project
            if (!ctx.is_admin && !hasProjectAccess(ctx.user_id, *new_task.project_id)) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to create tasks in this project.");
            }
            // If assigned_to is specified, ensure that user exists
            if (new_task.assigned_to && !user_service_.getUserById(*new_task.assigned_to)) {
                throw Exceptions::BadRequestException("Assigned user ID does not exist.");
            }


            Models::Task created_task = task_service_.createTask(new_task);

            crow::response res(crow::status::CREATED);
            res.set_header("Content-Type", "application/json");
            res.write(created_task.toJson().dump());
            logger->info("Task '{}' created in project ID: {} by user ID: {}", created_task.title, *created_task.project_id, ctx.user_id);
            return res;
        });

    // Get all tasks (Admin can see all, regular user sees their own projects' tasks and tasks assigned to them)
    CROW_ROUTE(app, "/tasks")
        .methods("GET"_method)
        ([this](const crow::request& req, Middleware::AuthMiddleware::context& ctx) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received GET /tasks request from user ID: {}", ctx.user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            int limit = req.url_params.get("limit") ? std::stoi(req.url_params.get("limit")) : 100;
            int offset = req.url_params.get("offset") ? std::stoi(req.url_params.get("offset")) : 0;

            std::vector<Models::Task> tasks;
            if (ctx.is_admin) {
                tasks = task_service_.getAllTasks(limit, offset);
                logger->info("Admin fetched {} tasks.", tasks.size());
            } else {
                // Fetch tasks for projects owned by the user
                std::vector<Models::Project> user_projects = project_service_.getProjectsByOwner(ctx.user_id);
                for (const auto& project : user_projects) {
                    std::vector<Models::Task> project_tasks = task_service_.getTasksByProject(*project.id);
                    tasks.insert(tasks.end(), project_tasks.begin(), project_tasks.end());
                }
                // Fetch tasks directly assigned to the user
                std::vector<Models::Task> assigned_tasks = task_service_.getTasksAssignedToUser(ctx.user_id);
                tasks.insert(tasks.end(), assigned_tasks.begin(), assigned_tasks.end());

                // Remove duplicates if a task is in an owned project AND assigned to the user
                std::sort(tasks.begin(), tasks.end(), [](const Models::Task& a, const Models::Task& b) {
                    return *a.id < *b.id;
                });
                tasks.erase(std::unique(tasks.begin(), tasks.end(), [](const Models::Task& a, const Models::Task& b) {
                    return *a.id == *b.id;
                }), tasks.end());

                logger->info("User ID {} fetched {} relevant tasks.", ctx.user_id, tasks.size());
            }
            
            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& task : tasks) {
                response_json.push_back(task.toJson());
            }

            crow::response res(crow::status::OK);
            res.set_header("Content-Type", "application/json");
            res.write(response_json.dump());
            return res;
        });

    // Get task by ID
    CROW_ROUTE(app, "/tasks/<int>")
        .methods("GET"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int task_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received GET /tasks/{} request.", task_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            std::optional<Models::Task> task = task_service_.getTaskById(task_id);
            if (!task) {
                throw Exceptions::NotFoundException("Task not found with ID: " + std::to_string(task_id));
            }

            // Authorization: Admin, project owner, or assigned user
            if (!ctx.is_admin &&
                !(task->project_id && hasProjectAccess(ctx.user_id, *task->project_id)) &&
                !(task->assigned_to && ctx.user_id == *task->assigned_to)) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to view this task.");
            }

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(task->toJson().dump());
            logger->info("Fetched task ID: {} for user ID: {}", task_id, ctx.user_id);
            return res;
        });

    // Update task by ID
    CROW_ROUTE(app, "/tasks/<int>")
        .methods("PUT"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int task_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received PUT /tasks/{} request.", task_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            std::optional<Models::Task> existing_task = task_service_.getTaskById(task_id);
            if (!existing_task) {
                throw Exceptions::NotFoundException("Task not found with ID: " + std::to_string(task_id));
            }

            // Authorization: Admin, project owner, or assigned user
            if (!ctx.is_admin &&
                !(existing_task->project_id && hasProjectAccess(ctx.user_id, *existing_task->project_id)) &&
                !(existing_task->assigned_to && ctx.user_id == *existing_task->assigned_to)) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to update this task.");
            }
            
            auto json_body = nlohmann::json::parse(req.body);
            Models::Task task_updates = Models::Task::fromJson(json_body);

            // Prevent changing project_id or assigned_to if not admin and not the project owner
            if (!ctx.is_admin && !(existing_task->project_id && hasProjectAccess(ctx.user_id, *existing_task->project_id))) {
                if (json_body.contains("project_id") && task_updates.project_id != existing_task->project_id) {
                    throw Exceptions::ForbiddenException("Only project owners or admins can change a task's project.");
                }
                if (json_body.contains("assigned_to") && task_updates.assigned_to != existing_task->assigned_to) {
                     // Allow assigned user to re-assign if they are an admin.
                    // For regular users, only the project owner can re-assign.
                    if (!ctx.is_admin && task_updates.assigned_to && *task_updates.assigned_to != ctx.user_id) {
                         throw Exceptions::ForbiddenException("Only project owners or admins can re-assign tasks to others.");
                    }
                }
            }
            
            // If project_id or assigned_to are updated, ensure new values are valid
            if (task_updates.project_id && !project_service_.getProjectById(*task_updates.project_id)) {
                throw Exceptions::BadRequestException("Invalid project_id provided for update.");
            }
            if (task_updates.assigned_to && !user_service_.getUserById(*task_updates.assigned_to)) {
                throw Exceptions::BadRequestException("Invalid assigned_to user ID provided for update.");
            }


            Models::Task updated_task = task_service_.updateTask(task_id, task_updates);

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(updated_task.toJson().dump());
            logger->info("Updated task ID: {} by user ID: {}", task_id, ctx.user_id);
            return res;
        });

    // Delete task by ID
    CROW_ROUTE(app, "/tasks/<int>")
        .methods("DELETE"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int task_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received DELETE /tasks/{} request.", task_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }

            std::optional<Models::Task> existing_task = task_service_.getTaskById(task_id);
            if (!existing_task) {
                throw Exceptions::NotFoundException("Task not found with ID: " + std::to_string(task_id));
            }

            // Authorization: Admin or project owner
            if (!ctx.is_admin && !(existing_task->project_id && hasProjectAccess(ctx.user_id, *existing_task->project_id))) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to delete this task.");
            }

            task_service_.deleteTask(task_id);

            res.code = crow::status::NO_CONTENT;
            res.end();
            logger->info("Deleted task ID: {} by user ID: {}", task_id, ctx.user_id);
            return res;
        });
}

} // namespace Controllers
} // namespace TaskManager
```