```cpp
#pragma once

#include <drogon/HttpController.h>
#include "../services/TaskService.h"
#include "../utils/ApiResponse.h"
#include "../models/Task.h"

// We declare services here to be injected via constructor
class TaskController : public drogon::HttpController<TaskController> {
public:
    TaskController(TaskService& taskService) : taskService_(taskService) {}

    METHOD_LIST_BEGIN
    // /api/v1/tasks (GET) - List all tasks for the authenticated user
    // /api/v1/tasks (POST) - Create a new task for the authenticated user
    ADD_METHOD_TO(TaskController::getTasks, "/api/v1/tasks", drogon::Get, "AuthFilter");
    ADD_METHOD_TO(TaskController::createTask, "/api/v1/tasks", drogon::Post, "AuthFilter");

    // /api/v1/tasks/{id} (GET) - Get a specific task by ID
    // /api/v1/tasks/{id} (PUT) - Update a specific task by ID
    // /api/v1/tasks/{id} (DELETE) - Delete a specific task by ID
    ADD_METHOD_TO(TaskController::getTaskById, "/api/v1/tasks/{id}", drogon::Get, "AuthFilter");
    ADD_METHOD_TO(TaskController::updateTask, "/api/v1/tasks/{id}", drogon::Put, "AuthFilter");
    ADD_METHOD_TO(TaskController::deleteTask, "/api/v1/tasks/{id}", drogon::Delete, "AuthFilter");
    METHOD_LIST_END

    void getTasks(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void createTask(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getTaskById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);
    void updateTask(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);
    void deleteTask(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);

private:
    TaskService& taskService_;
};
```