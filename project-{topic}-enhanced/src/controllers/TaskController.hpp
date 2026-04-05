```cpp
#ifndef TASK_CONTROLLER_HPP
#define TASK_CONTROLLER_HPP

#include "crow.h"
#include "../services/TaskService.hpp"
#include "../services/UserService.hpp" // For potential user-related checks

class TaskController {
public:
    TaskController(TaskService& taskService, UserService& userService);

    // Handles creating a new task.
    crow::response createTask(const crow::request& req);

    // Handles retrieving tasks (all for admin, specific user's for regular users).
    crow::response getTasks(const crow::request& req);

    // Handles retrieving a specific task by ID.
    crow::response getTaskById(const crow::request& req, int taskId);

    // Handles updating a specific task by ID.
    crow::response updateTask(const crow::request& req, int taskId);

    // Handles deleting a specific task by ID.
    crow::response deleteTask(const crow::request& req, int taskId);

private:
    TaskService& taskService;
    UserService& userService;
};

#endif // TASK_CONTROLLER_HPP
```