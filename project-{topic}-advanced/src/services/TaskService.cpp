```cpp
#include "TaskService.hpp"

TaskService::TaskService(std::shared_ptr<DatabaseManager> db_manager)
    : db_manager_(db_manager) {}

Task TaskService::createTask(const TaskCreateDTO& task_dto) {
    Logger::log(LogLevel::INFO, "Attempting to create task: " + task_dto.title + " for project ID: " + std::to_string(task_dto.project_id));

    // Validate project existence
    if (!db_manager_->getProjectById(task_dto.project_id).has_value()) {
        throw NotFoundException("Project with ID " + std::to_string(task_dto.project_id) + " not found.");
    }
    // Validate assigned_user_id existence if provided
    if (task_dto.assigned_user_id.has_value() && !db_manager_->getUserById(task_dto.assigned_user_id.value()).has_value()) {
        throw BadRequestException("Assigned user with ID " + std::to_string(task_dto.assigned_user_id.value()) + " does not exist.");
    }

    TaskStatus status = TaskStatus::TODO;
    if (task_dto.status.has_value()) {
        std::string status_str = task_dto.status.value();
        std::transform(status_str.begin(), status_str.end(), status_str.begin(), ::toupper);
        if (status_str == "IN_PROGRESS") status = TaskStatus::IN_PROGRESS;
        else if (status_str == "DONE") status = TaskStatus::DONE;
        else if (status_str != "TODO") {
            throw BadRequestException("Invalid task status: " + task_dto.status.value());
        }
    }

    Task new_task(task_dto.title, task_dto.description, status, task_dto.project_id, task_dto.assigned_user_id);

    try {
        int new_task_id = db_manager_->createTask(new_task);
        new_task.id = new_task_id;
        Logger::log(LogLevel::INFO, "Task " + new_task.title + " created successfully with ID " + std::to_string(new_task_id));
        return new_task;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error during task creation: " + std::string(e.what()));
        throw ServiceException("Failed to create task due to database error.");
    }
}

std::optional<Task> TaskService::getTaskById(int id) {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve task with ID: " + std::to_string(id));
    auto task = db_manager_->getTaskById(id);
    if (!task.has_value()) {
        throw NotFoundException("Task with ID " + std::to_string(id) + " not found.");
    }
    return task;
}

std::vector<Task> TaskService::getAllTasks() {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve all tasks.");
    return db_manager_->getAllTasks();
}

std::vector<Task> TaskService::getTasksByProjectId(int project_id) {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve tasks for project ID: " + std::to_string(project_id));
    if (!db_manager_->getProjectById(project_id).has_value()) {
        throw NotFoundException("Project with ID " + std::to_string(project_id) + " not found.");
    }
    return db_manager_->getTasksByProjectId(project_id);
}

std::vector<Task> TaskService::getTasksByAssignedUserId(int user_id) {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve tasks assigned to user ID: " + std::to_string(user_id));
     if (!db_manager_->getUserById(user_id).has_value()) {
        throw NotFoundException("User with ID " + std::to_string(user_id) + " not found.");
    }
    return db_manager_->getTasksByAssignedUserId(user_id);
}

Task TaskService::updateTask(int id, const TaskUpdateDTO& task_dto) {
    Logger::log(LogLevel::INFO, "Attempting to update task with ID: " + std::to_string(id));

    std::optional<Task> existing_task_opt = db_manager_->getTaskById(id);
    if (!existing_task_opt.has_value()) {
        throw NotFoundException("Task with ID " + std::to_string(id) + " not found.");
    }

    Task updated_task = existing_task_opt.value();
    updated_task.id = id; // Ensure ID is set for the update operation

    if (task_dto.title.has_value()) {
        updated_task.title = task_dto.title.value();
    }
    if (task_dto.description.has_value()) {
        updated_task.description = task_dto.description.value();
    }
    if (task_dto.status.has_value()) {
        std::string status_str = task_dto.status.value();
        std::transform(status_str.begin(), status_str.end(), status_str.begin(), ::toupper);
        if (status_str == "TODO") updated_task.status = TaskStatus::TODO;
        else if (status_str == "IN_PROGRESS") updated_task.status = TaskStatus::IN_PROGRESS;
        else if (status_str == "DONE") updated_task.status = TaskStatus::DONE;
        else {
            throw BadRequestException("Invalid task status: " + task_dto.status.value());
        }
    }
    if (task_dto.project_id.has_value()) {
        if (!db_manager_->getProjectById(task_dto.project_id.value()).has_value()) {
            throw BadRequestException("Project with ID " + std::to_string(task_dto.project_id.value()) + " does not exist.");
        }
        updated_task.project_id = task_dto.project_id.value();
    }
    if (task_dto.assigned_user_id.has_value()) {
        // Validate if new assigned_user_id exists
        if (task_dto.assigned_user_id.value() != 0 && !db_manager_->getUserById(task_dto.assigned_user_id.value()).has_value()) {
            throw BadRequestException("Assigned user with ID " + std::to_string(task_dto.assigned_user_id.value()) + " does not exist.");
        }
        updated_task.assigned_user_id = task_dto.assigned_user_id.value();
    } else if (task_dto.assigned_user_id == std::nullopt) { // Explicitly setting to null
        updated_task.assigned_user_id = std::nullopt;
    }

    try {
        db_manager_->updateTask(updated_task);
        Logger::log(LogLevel::INFO, "Task with ID " + std::to_string(id) + " updated successfully.");
        return updated_task;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error updating task " + std::to_string(id) + ": " + std::string(e.what()));
        throw ServiceException("Failed to update task due to database error.");
    }
}

bool TaskService::deleteTask(int id) {
    Logger::log(LogLevel::INFO, "Attempting to delete task with ID: " + std::to_string(id));

    if (!db_manager_->getTaskById(id).has_value()) {
        throw NotFoundException("Task with ID " + std::to_string(id) + " not found.");
    }

    try {
        db_manager_->deleteTask(id);
        Logger::log(LogLevel::INFO, "Task with ID " + std::to_string(id) + " deleted successfully.");
        return true;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error deleting task " + std::to_string(id) + ": " + std::string(e.what()));
        throw ServiceException("Failed to delete task due to database error.");
    }
}
```