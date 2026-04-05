```cpp
#ifndef TASK_SERVICE_HPP
#define TASK_SERVICE_HPP

#include "../database/Database.hpp"
#include "../models/Task.hpp"

#include <string>
#include <vector>
#include <optional>

// TaskService handles business logic related to tasks.
class TaskService {
public:
    TaskService(Database& db);

    // Creates a new task.
    // @param task The Task object to create. ID will be updated upon successful creation.
    // @return The ID of the newly created task.
    // Throws std::runtime_error on validation or database errors.
    int createTask(Task& task);

    // Retrieves a task by its ID.
    // @param taskId The ID of the task to retrieve.
    // @return An optional containing the Task if found, std::nullopt otherwise.
    // Throws std::runtime_error on database errors.
    std::optional<Task> getTaskById(int taskId);

    // Retrieves all tasks belonging to a specific user.
    // @param userId The ID of the user whose tasks to retrieve.
    // @return A vector of Task objects.
    // Throws std::runtime_error on database errors.
    std::vector<Task> getTasksByUserId(int userId);

    // Retrieves all tasks in the system. (Admin-level access typically)
    // @return A vector of all Task objects.
    // Throws std::runtime_error on database errors.
    std::vector<Task> getAllTasks();

    // Updates an existing task.
    // @param taskId The ID of the task to update.
    // @param updatedTask The Task object with updated fields.
    // @return True if the update was successful, false if the task was not found.
    // Throws std::runtime_error on validation or database errors.
    bool updateTask(int taskId, Task& updatedTask);

    // Deletes a task by its ID.
    // @param taskId The ID of the task to delete.
    // @return True if the deletion was successful, false if the task was not found.
    // Throws std::runtime_error on database errors.
    bool deleteTask(int taskId);

private:
    Database& db;
};

#endif // TASK_SERVICE_HPP
```