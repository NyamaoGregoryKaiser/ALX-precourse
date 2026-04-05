```cpp
#ifndef TASK_SERVICE_H
#define TASK_SERVICE_H

#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <memory>
#include <optional>
#include "models/Task.h"
#include "models/Project.h"
#include "models/User.h"
#include "models/Tag.h"
#include "models/TaskTag.h"
#include "utils/AppErrors.h"

namespace TaskManager {

// Helper to validate and convert string to enum.
// For TaskStatus and TaskPriority, which are DB ENUMs, Drogon ORM uses std::string
// This service layer should handle validation of these strings.
// A more robust solution might involve custom C++ enum types and conversion functions.
inline bool isValidTaskStatus(const std::string& status) {
    return status == "Open" || status == "InProgress" || status == "Blocked" ||
           status == "Review" || status == "Done" || status == "Archived";
}

inline bool isValidTaskPriority(const std::string& priority) {
    return priority == "Low" || priority == "Medium" || priority == "High" ||
           priority == "Urgent";
}

/**
 * @brief Service class for task related business logic.
 * Handles CRUD operations for tasks, and managing task-tag relationships.
 */
class TaskService {
public:
    TaskService(drogon::orm::DbClientPtr dbClient)
        : _dbClient(dbClient), _taskMapper(dbClient), _projectMapper(dbClient),
          _userMapper(dbClient), _tagMapper(dbClient), _taskTagMapper(dbClient) {}

    /**
     * @brief Creates a new task.
     * @param projectId The ID of the project the task belongs to.
     * @param userId The ID of the user creating the task (for authorization/ownership check).
     * @param title The title of the task.
     * @param description Optional description.
     * @param status Optional initial status.
     * @param priority Optional initial priority.
     * @param dueDate Optional due date.
     * @param assignedTo Optional user ID to assign the task to.
     * @param tagIds Optional list of tag IDs to associate.
     * @return The created Task object.
     * @throws ValidationException if input is invalid.
     * @throws NotFoundException if project, assigned user, or tags do not exist.
     * @throws AuthException if user is not project owner.
     * @throws InternalServerException on database errors.
     */
    Task createTask(int projectId, int userId, const std::string& title,
                    const std::optional<std::string>& description,
                    const std::optional<std::string>& status,
                    const std::optional<std::string>& priority,
                    const std::optional<trantor::Date>& dueDate,
                    const std::optional<int>& assignedTo,
                    const std::vector<int>& tagIds = {}) {
        if (title.empty()) {
            throw ValidationException("Task title cannot be empty.");
        }
        if (status && !isValidTaskStatus(*status)) {
            throw ValidationException("Invalid task status: " + *status);
        }
        if (priority && !isValidTaskPriority(*priority)) {
            throw ValidationException("Invalid task priority: " + *priority);
        }

        try {
            // Verify project exists and belongs to the user
            Project project = _projectMapper.findByPrimaryKey(projectId);
            if (project.getOwnerId() != userId) {
                throw AuthException("You are not authorized to create tasks in this project.");
            }

            // Verify assigned user exists
            if (assignedTo) {
                _userMapper.findByPrimaryKey(*assignedTo);
            }

            // Verify all tag IDs exist
            for (int tagId : tagIds) {
                _tagMapper.findByPrimaryKey(tagId);
            }

            Task newTask(_dbClient);
            newTask.setProjectId(projectId);
            newTask.setTitle(title);
            if (description) newTask.setDescription(*description);
            if (status) newTask.setStatus(*status);
            if (priority) newTask.setPriority(*priority);
            if (dueDate) newTask.setDueDate(*dueDate);
            if (assignedTo) newTask.setAssignedTo(*assignedTo);

            // Use a transaction for atomic operation (task + tags)
            auto transaction = _dbClient->newTransaction();
            transaction->execSqlSync("BEGIN"); // Explicitly begin transaction

            newTask.insert(transaction); // Insert task within transaction

            // Associate tags
            for (int tagId : tagIds) {
                TaskTag taskTag(transaction);
                taskTag.setTaskId(newTask.getId());
                taskTag.setTagId(tagId);
                taskTag.insert(transaction);
            }

            transaction->execSqlSync("COMMIT"); // Commit transaction
            LOG_INFO << "Task created: " << title << " in project ID " << projectId;
            return newTask;
        } catch (const drogon::orm::DrogonDbException& e) {
            _dbClient->execSqlSync("ROLLBACK"); // Rollback on error
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Project, assigned user, or tag not found.");
            }
            LOG_ERROR << "Database error creating task: " << e.what();
            throw InternalServerException("Database error creating task.");
        } catch (const NotFoundException& e) {
            _dbClient->execSqlSync("ROLLBACK");
            throw;
        } catch (const AuthException& e) {
            _dbClient->execSqlSync("ROLLBACK");
            throw;
        } catch (const ValidationException& e) {
            _dbClient->execSqlSync("ROLLBACK");
            throw;
        } catch (const std::exception& e) {
            _dbClient->execSqlSync("ROLLBACK");
            LOG_ERROR << "Unexpected error creating task: " << e.what();
            throw InternalServerException("Failed to create task due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves a task by its ID.
     * @param taskId The ID of the task.
     * @param userId The ID of the user requesting the task (for authorization).
     * @return The Task object.
     * @throws NotFoundException if task does not exist.
     * @throws AuthException if user does not have access to the task's project.
     * @throws InternalServerException on database errors.
     */
    Task getTaskById(int taskId, int userId) {
        try {
            Task task = _taskMapper.findByPrimaryKey(taskId);
            Project project = _projectMapper.findByPrimaryKey(task.getProjectId());

            // Only project owner can view tasks in their project
            if (project.getOwnerId() != userId) {
                throw AuthException("You are not authorized to view this task.");
            }
            return task;
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Task with ID " + std::to_string(taskId) + " not found.");
            }
            LOG_ERROR << "Database error fetching task by ID: " << e.what();
            throw InternalServerException("Database error fetching task.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const AuthException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching task by ID: " << e.what();
            throw InternalServerException("Failed to fetch task due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves tasks for a specific project.
     * @param projectId The ID of the project.
     * @param userId The ID of the user requesting tasks (for authorization).
     * @return A vector of Task objects.
     * @throws NotFoundException if project does not exist.
     * @throws AuthException if user does not have access to the project.
     * @throws InternalServerException on database errors.
     */
    std::vector<Task> getTasksByProjectId(int projectId, int userId) {
        try {
            Project project = _projectMapper.findByPrimaryKey(projectId);
            if (project.getOwnerId() != userId) {
                throw AuthException("You are not authorized to view tasks in this project.");
            }
            return _taskMapper.findBy(drogon::orm::Criteria("project_id", drogon::orm::EQ, projectId));
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Project with ID " + std::to_string(projectId) + " not found.");
            }
            LOG_ERROR << "Database error fetching tasks by project ID: " << e.what();
            throw InternalServerException("Database error fetching tasks for project.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const AuthException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching tasks by project ID: " << e.what();
            throw InternalServerException("Failed to fetch tasks due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves all tasks assigned to a specific user.
     * @param userId The ID of the user.
     * @return A vector of Task objects.
     * @throws InternalServerException on database errors.
     */
    std::vector<Task> getTasksAssignedToUser(int userId) {
        try {
            // Check if user exists
            _userMapper.findByPrimaryKey(userId);
            return _taskMapper.findBy(drogon::orm::Criteria("assigned_to", drogon::orm::EQ, userId));
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("User with ID " + std::to_string(userId) + " not found.");
            }
            LOG_ERROR << "Database error fetching tasks assigned to user: " << e.what();
            throw InternalServerException("Database error fetching assigned tasks.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching tasks assigned to user: " << e.what();
            throw InternalServerException("Failed to fetch assigned tasks due to an unexpected error.");
        }
    }


    /**
     * @brief Updates an existing task.
     * @param taskId The ID of the task to update.
     * @param userId The ID of the user performing the update (for authorization).
     * @param title_opt Optional new title.
     * @param description_opt Optional new description.
     * @param status_opt Optional new status.
     * @param priority_opt Optional new priority.
     * @param dueDate_opt Optional new due date.
     * @param assignedTo_opt Optional new assigned user ID.
     * @param tagIds_opt Optional list of tag IDs to update associations.
     * @return The updated Task object.
     * @throws NotFoundException if task, project, assigned user, or tags do not exist.
     * @throws AuthException if user is not project owner.
     * @throws ValidationException if input is invalid.
     * @throws InternalServerException on database errors.
     */
    Task updateTask(int taskId, int userId,
                    const std::optional<std::string>& title_opt,
                    const std::optional<std::string>& description_opt,
                    const std::optional<std::string>& status_opt,
                    const std::optional<std::string>& priority_opt,
                    const std::optional<trantor::Date>& dueDate_opt,
                    const std::optional<int>& assignedTo_opt,
                    const std::optional<std::vector<int>>& tagIds_opt) {
        try {
            Task task = _taskMapper.findByPrimaryKey(taskId);
            Project project = _projectMapper.findByPrimaryKey(task.getProjectId());

            if (project.getOwnerId() != userId) {
                throw AuthException("You are not authorized to update this task.");
            }

            if (title_opt) {
                if (title_opt->empty()) {
                    throw ValidationException("Task title cannot be empty.");
                }
                task.setTitle(*title_opt);
            }
            if (description_opt) {
                task.setDescription(*description_opt);
            } else if (task.getDescription().has_value()) { // Clear description if nullopt is passed
                task.setDescription(std::nullopt);
            }
            if (status_opt) {
                if (!isValidTaskStatus(*status_opt)) {
                    throw ValidationException("Invalid task status: " + *status_opt);
                }
                task.setStatus(*status_opt);
            }
            if (priority_opt) {
                if (!isValidTaskPriority(*priority_opt)) {
                    throw ValidationException("Invalid task priority: " + *priority_opt);
                }
                task.setPriority(*priority_opt);
            }
            if (dueDate_opt) {
                task.setDueDate(*dueDate_opt);
            } else if (task.getDueDate().has_value()) { // Clear due_date if nullopt is passed
                 task.setDueDate(std::nullopt);
            }

            if (assignedTo_opt) {
                _userMapper.findByPrimaryKey(*assignedTo_opt); // Verify assigned user exists
                task.setAssignedTo(*assignedTo_opt);
            } else if (task.getAssignedTo().has_value()) { // Clear assigned_to if nullopt is passed
                task.setAssignedTo(std::nullopt);
            }

            auto transaction = _dbClient->newTransaction();
            transaction->execSqlSync("BEGIN"); // Explicitly begin transaction

            task.update(transaction); // Update task

            if (tagIds_opt) {
                // Clear existing tags for this task
                _taskTagMapper.deleteBy(drogon::orm::Criteria("task_id", drogon::orm::EQ, taskId), transaction);

                // Add new tags
                for (int tagId : *tagIds_opt) {
                    _tagMapper.findByPrimaryKey(tagId); // Verify each tag exists
                    TaskTag taskTag(transaction);
                    taskTag.setTaskId(taskId);
                    taskTag.setTagId(tagId);
                    taskTag.insert(transaction);
                }
            }

            transaction->execSqlSync("COMMIT"); // Commit transaction
            LOG_INFO << "Task ID " << taskId << " updated by user ID " << userId;
            return task;
        } catch (const drogon::orm::DrogonDbException& e) {
            _dbClient->execSqlSync("ROLLBACK");
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Task, project, assigned user, or tag not found.");
            }
            LOG_ERROR << "Database error updating task: " << e.what();
            throw InternalServerException("Database error updating task.");
        } catch (const NotFoundException& e) {
            _dbClient->execSqlSync("ROLLBACK");
            throw;
        } catch (const AuthException& e) {
            _dbClient->execSqlSync("ROLLBACK");
            throw;
        } catch (const ValidationException& e) {
            _dbClient->execSqlSync("ROLLBACK");
            throw;
        } catch (const std::exception& e) {
            _dbClient->execSqlSync("ROLLBACK");
            LOG_ERROR << "Unexpected error updating task: " << e.what();
            throw InternalServerException("Failed to update task due to an unexpected error.");
        }
    }

    /**
     * @brief Deletes a task by its ID.
     * @param taskId The ID of the task to delete.
     * @param userId The ID of the user performing the deletion (for authorization).
     * @throws NotFoundException if task does not exist.
     * @throws AuthException if user is not project owner.
     * @throws InternalServerException on database errors.
     */
    void deleteTask(int taskId, int userId) {
        try {
            Task task = _taskMapper.findByPrimaryKey(taskId);
            Project project = _projectMapper.findByPrimaryKey(task.getProjectId());

            if (project.getOwnerId() != userId) {
                throw AuthException("You are not authorized to delete this task.");
            }

            // Deletion cascade from task to task_tags is handled by database foreign key constraint.
            task.destroy();
            LOG_INFO << "Task ID " << taskId << " deleted by user ID " << userId;
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Task with ID " + std::to_string(taskId) + " not found.");
            }
            LOG_ERROR << "Database error deleting task: " << e.what();
            throw InternalServerException("Database error deleting task.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const AuthException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error deleting task: " << e.what();
            throw InternalServerException("Failed to delete task due to an unexpected error.");
        }
    }

private:
    drogon::orm::DbClientPtr _dbClient;
    drogon::orm::Mapper<Task> _taskMapper;
    drogon::orm::Mapper<Project> _projectMapper;
    drogon::orm::Mapper<User> _userMapper;
    drogon::orm::Mapper<Tag> _tagMapper;
    drogon::orm::Mapper<TaskTag> _taskTagMapper;
};

} // namespace TaskManager

#endif // TASK_SERVICE_H
```