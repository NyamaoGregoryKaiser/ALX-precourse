```cpp
#include "TaskService.hpp"
#include "../logger/Logger.hpp"
#include "../models/Task.hpp"
#include "../database/Database.hpp" // For SQLiteException

#include <stdexcept>
#include <string>
#include <vector>
#include <optional>

TaskService::TaskService(Database& db) : db(db) {}

// Creates a new task in the database.
int TaskService::createTask(Task& task) {
    // Basic validation
    if (task.getTitle().empty()) {
        throw std::runtime_error("Task title cannot be empty.");
    }
    // More complex validation (e.g., status enum) should be done in Task model setter or controller

    try {
        int newTaskId = Task::create(db, task);
        task.setId(newTaskId); // Update the task object with the new ID
        Logger::info("TaskService: Created task '{}' for user {}. ID: {}", task.getTitle(), task.getUserId(), newTaskId);
        return newTaskId;
    } catch (const SQLiteException& e) {
        Logger::error("TaskService: SQLite error creating task: {}", e.what());
        throw std::runtime_error("Database error while creating task.");
    }
}

// Retrieves a task by its ID.
std::optional<Task> TaskService::getTaskById(int taskId) {
    try {
        std::optional<Task> task = Task::findById(db, taskId);
        if (task) {
            Logger::debug("TaskService: Retrieved task with ID {}.", taskId);
        } else {
            Logger::debug("TaskService: Task with ID {} not found.", taskId);
        }
        return task;
    } catch (const SQLiteException& e) {
        Logger::error("TaskService: SQLite error retrieving task by ID {}: {}", taskId, e.what());
        throw std::runtime_error("Database error while retrieving task.");
    }
}

// Retrieves all tasks belonging to a specific user.
std::vector<Task> TaskService::getTasksByUserId(int userId) {
    try {
        std::vector<Task> tasks = Task::findByUserId(db, userId);
        Logger::debug("TaskService: Retrieved {} tasks for user ID {}.", tasks.size(), userId);
        return tasks;
    } catch (const SQLiteException& e) {
        Logger::error("TaskService: SQLite error retrieving tasks for user ID {}: {}", userId, e.what());
        throw std::runtime_error("Database error while retrieving user tasks.");
    }
}

// Retrieves all tasks from the database (typically for admin use).
std::vector<Task> TaskService::getAllTasks() {
    try {
        std::vector<Task> tasks = Task::findAll(db);
        Logger::debug("TaskService: Retrieved all {} tasks.", tasks.size());
        return tasks;
    } catch (const SQLiteException& e) {
        Logger::error("TaskService: SQLite error retrieving all tasks: {}", e.what());
        throw std::runtime_error("Database error while retrieving all tasks.");
    }
}

// Updates an existing task in the database.
bool TaskService::updateTask(int taskId, Task& updatedTask) {
    // Ensure the ID of the updatedTask matches the taskId passed
    updatedTask.setId(taskId);

    // Basic validation
    if (updatedTask.getTitle().empty()) {
        throw std::runtime_error("Task title cannot be empty.");
    }

    try {
        bool success = Task::update(db, updatedTask);
        if (success) {
            Logger::info("TaskService: Updated task with ID {}.", taskId);
        } else {
            Logger::warn("TaskService: Task with ID {} not found for update.", taskId);
            throw std::runtime_error("Task not found for update.");
        }
        return success;
    } catch (const SQLiteException& e) {
        Logger::error("TaskService: SQLite error updating task {}: {}", taskId, e.what());
        throw std::runtime_error("Database error while updating task.");
    }
}

// Deletes a task by its ID.
bool TaskService::deleteTask(int taskId) {
    try {
        bool success = Task::remove(db, taskId);
        if (success) {
            Logger::info("TaskService: Deleted task with ID {}.", taskId);
        } else {
            Logger::warn("TaskService: Task with ID {} not found for deletion.", taskId);
            throw std::runtime_error("Task not found for deletion.");
        }
        return success;
    } catch (const SQLiteException& e) {
        Logger::error("TaskService: SQLite error deleting task {}: {}", taskId, e.what());
        throw std::runtime_error("Database error while deleting task.");
    }
}
```