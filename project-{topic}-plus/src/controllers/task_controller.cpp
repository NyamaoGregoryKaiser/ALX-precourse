#include "task_controller.h"

TaskController::TaskController() {
    LOG_INFO("TaskController initialized.");
}

Pistache::Rest::RouteCallback TaskController::get_all_tasks() {
    return Pistache::Rest::Routes::Get([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        AuthContext* auth_context = static_cast<AuthContext*>(request.getUserData(reinterpret_cast<void*>(1)));
        if (!auth_context) {
            throw InternalServerException("Authentication context missing for /tasks endpoint.");
        }

        try {
            std::vector<Task> tasks;
            if (auth_context->role == UserRole::ADMIN) {
                // Admins can see all tasks
                tasks = Task::find_all();
                LOG_INFO("Admin user " + auth_context->username + " fetched all tasks.");
            } else {
                // Regular users only see their own tasks
                tasks = Task::find_by_user_id(auth_context->user_id);
                LOG_INFO("User " + auth_context->username + " fetched their own tasks.");
            }

            Json::Value tasks_json = Json::arrayValue;
            for (const auto& task : tasks) {
                tasks_json.append(task.to_json());
            }

            Json::Value response_json;
            response_json["status"] = "success";
            response_json["data"] = tasks_json;

            response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
            response.send(Pistache::Http::Code::Ok, JsonUtil::to_string(response_json)).get();
        } catch (const ApiException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching tasks for user " + auth_context->username + ": " + std::string(e.what()));
            throw InternalServerException("Failed to retrieve tasks.");
        }
    });
}

Pistache::Rest::RouteCallback TaskController::get_task_by_id() {
    return Pistache::Rest::Routes::Get([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        AuthContext* auth_context = static_cast<AuthContext*>(request.getUserData(reinterpret_cast<void*>(1)));
        if (!auth_context) {
            throw InternalServerException("Authentication context missing for /tasks/:id endpoint.");
        }

        long task_id;
        try {
            task_id = std::stol(request.param(":id").as<std::string>());
        } catch (const std::exception&) {
            throw BadRequestException("Invalid task ID format.");
        }

        try {
            // Try to get from cache first
            if (std::optional<Task> cached_task = task_cache_.get("task_" + std::to_string(task_id))) {
                 if (auth_context->role == UserRole::ADMIN || cached_task->user_id == auth_context->user_id) {
                    Json::Value response_json;
                    response_json["status"] = "success";
                    response_json["data"] = cached_task->to_json();
                    LOG_DEBUG("Task ID " + std::to_string(task_id) + " fetched from cache.");
                    response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
                    response.send(Pistache::Http::Code::Ok, JsonUtil::to_string(response_json)).get();
                    return;
                }
            }

            std::optional<Task> task = Task::find_by_id(task_id);

            if (!task) {
                throw NotFoundException("Task with ID " + std::to_string(task_id) + " not found.");
            }

            // Authorization check: Only owner or admin can view a task
            if (auth_context->role != UserRole::ADMIN && task->user_id != auth_context->user_id) {
                throw ForbiddenException("Access denied. You do not own this task.");
            }

            // Cache the task
            task_cache_.set("task_" + std::to_string(task_id), *task, 60); // Cache for 60 seconds
            LOG_DEBUG("Task ID " + std::to_string(task_id) + " fetched from DB and cached.");


            Json::Value response_json;
            response_json["status"] = "success";
            response_json["data"] = task->to_json();

            response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
            response.send(Pistache::Http::Code::Ok, JsonUtil::to_string(response_json)).get();
        } catch (const ApiException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching task ID " + std::to_string(task_id) + ": " + std::string(e.what()));
            throw InternalServerException("Failed to retrieve task.");
        }
    });
}

Pistache::Rest::RouteCallback TaskController::create_task() {
    return Pistache::Rest::Routes::Post([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        AuthContext* auth_context = static_cast<AuthContext*>(request.getUserData(reinterpret_cast<void*>(1)));
        if (!auth_context) {
            throw InternalServerException("Authentication context missing for /tasks endpoint.");
        }

        std::optional<Json::Value> json_body = JsonUtil::parse_json(request.body());
        if (!json_body) {
            throw BadRequestException("Invalid JSON in request body.");
        }

        if (!JsonUtil::has_required_fields(*json_body, {"title", "description", "due_date"})) {
            throw BadRequestException("Missing required fields: title, description, due_date.");
        }

        std::string title = JsonUtil::get_string(*json_body, "title");
        std::string description = JsonUtil::get_string(*json_body, "description");
        std::string status_str = JsonUtil::get_string(*json_body, "status", "pending");
        std::string due_date = JsonUtil::get_string(*json_body, "due_date");

        try {
            TaskStatus status = string_to_task_status(status_str);
            // Task is created by the authenticated user
            std::optional<Task> new_task = Task::create(title, description, status, due_date, auth_context->user_id);

            if (new_task) {
                // Invalidate cache for all tasks or specific user tasks if such caching was implemented
                // For simplicity, for single item, we just don't add it to cache here,
                // it will be cached on first GET request.

                Json::Value response_json;
                response_json["status"] = "success";
                response_json["message"] = "Task created successfully.";
                response_json["task"] = new_task->to_json();

                response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
                response.send(Pistache::Http::Code::Created, JsonUtil::to_string(response_json)).get();
            } else {
                throw InternalServerException("Failed to create task due to an unknown error.");
            }
        } catch (const ApiException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error creating task for user " + auth_context->username + ": " + std::string(e.what()));
            throw InternalServerException("Failed to create task.");
        }
    });
}

Pistache::Rest::RouteCallback TaskController::update_task() {
    return Pistache::Rest::Routes::Put([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        AuthContext* auth_context = static_cast<AuthContext*>(request.getUserData(reinterpret_cast<void*>(1)));
        if (!auth_context) {
            throw InternalServerException("Authentication context missing for /tasks/:id endpoint.");
        }

        long task_id;
        try {
            task_id = std::stol(request.param(":id").as<std::string>());
        } catch (const std::exception&) {
            throw BadRequestException("Invalid task ID format.");
        }

        std::optional<Json::Value> json_body = JsonUtil::parse_json(request.body());
        if (!json_body) {
            throw BadRequestException("Invalid JSON in request body.");
        }

        try {
            std::optional<Task> existing_task = Task::find_by_id(task_id);
            if (!existing_task) {
                throw NotFoundException("Task with ID " + std::to_string(task_id) + " not found.");
            }

            // Authorization check: Only owner or admin can update a task
            if (auth_context->role != UserRole::ADMIN && existing_task->user_id != auth_context->user_id) {
                throw ForbiddenException("Access denied. You do not own this task.");
            }

            // Update fields if present in JSON body
            if (json_body->isMember("title")) {
                existing_task->title = JsonUtil::get_string(*json_body, "title");
            }
            if (json_body->isMember("description")) {
                existing_task->description = JsonUtil::get_string(*json_body, "description");
            }
            if (json_body->isMember("status")) {
                existing_task->status = string_to_task_status(JsonUtil::get_string(*json_body, "status"));
            }
            if (json_body->isMember("due_date")) {
                existing_task->due_date = JsonUtil::get_string(*json_body, "due_date");
            }

            if (existing_task->update()) {
                // Invalidate cache for this specific task
                task_cache_.remove("task_" + std::to_string(task_id));
                LOG_DEBUG("Task ID " + std::to_string(task_id) + " updated and cache invalidated.");

                Json::Value response_json;
                response_json["status"] = "success";
                response_json["message"] = "Task updated successfully.";
                response_json["task"] = existing_task->to_json();

                response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
                response.send(Pistache::Http::Code::Ok, JsonUtil::to_string(response_json)).get();
            } else {
                throw InternalServerException("Failed to update task with ID " + std::to_string(task_id) + ".");
            }
        } catch (const ApiException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error updating task ID " + std::to_string(task_id) + ": " + std::string(e.what()));
            throw InternalServerException("Failed to update task.");
        }
    });
}

Pistache::Rest::RouteCallback TaskController::delete_task() {
    return Pistache::Rest::Routes::Delete([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        AuthContext* auth_context = static_cast<AuthContext*>(request.getUserData(reinterpret_cast<void*>(1)));
        if (!auth_context) {
            throw InternalServerException("Authentication context missing for /tasks/:id endpoint.");
        }
        
        // Role check (Admin only) is handled by JwtMiddleware::require_role in server.cpp before this handler is called.
        // So, we just proceed with the deletion logic here.

        long task_id;
        try {
            task_id = std::stol(request.param(":id").as<std::string>());
        } catch (const std::exception&) {
            throw BadRequestException("Invalid task ID format.");
        }

        try {
            std::optional<Task> existing_task = Task::find_by_id(task_id);
            if (!existing_task) {
                throw NotFoundException("Task with ID " + std::to_string(task_id) + " not found.");
            }

            // Although `require_role(ADMIN)` is before this,
            // a non-admin could try to delete their own task.
            // If we wanted to allow users to delete their own tasks AND admins to delete any,
            // the logic here would be: `if (auth_context->role != UserRole::ADMIN && existing_task->user_id != auth_context->user_id)`
            // But since the route is configured to `require_role(ADMIN)`, only admins reach this point.
            // No explicit user_id check is needed here due to the `require_role(ADMIN)` middleware.

            if (existing_task->remove()) {
                // Invalidate cache for this specific task
                task_cache_.remove("task_" + std::to_string(task_id));
                LOG_DEBUG("Task ID " + std::to_string(task_id) + " deleted and cache invalidated.");

                Json::Value response_json;
                response_json["status"] = "success";
                response_json["message"] = "Task deleted successfully.";

                response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
                response.send(Pistache::Http::Code::Ok, JsonUtil::to_string(response_json)).get();
            } else {
                throw InternalServerException("Failed to delete task with ID " + std::to_string(task_id) + ".");
            }
        } catch (const ApiException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR("Error deleting task ID " + std::to_string(task_id) + ": " + std::string(e.what()));
            throw InternalServerException("Failed to delete task.");
        }
    });
}
```