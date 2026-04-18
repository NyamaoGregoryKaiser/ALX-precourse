#include "task_service.h"
#include "../utils/logger.h"
#include <algorithm>

TaskService::TaskService(DbManager& db_manager) : db_manager_(db_manager) {}

Task TaskService::createTask(Task& task) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "INSERT INTO tasks (project_id, title, description, due_date, status, assigned_to_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at;";
        pqxx::result r = txn.exec_params(
            query,
            task.project_id,
            task.title,
            task.description,
            task.due_date,
            task.status,
            task.assigned_to_id
        );

        if (!r.empty()) {
            task.id = r[0]["id"].as<std::string>();
            task.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            task.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            txn.commit();
            Logger::info("Task created: {} for project {}", task.title, task.project_id);
            return task;
        }
        throw std::runtime_error("Failed to create task: No ID returned.");
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error creating task: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error creating task.");
    }
}

std::optional<Task> TaskService::getTaskById(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT id, project_id, title, description, due_date, status, assigned_to_id, created_at, updated_at FROM tasks WHERE id = $1;";
        pqxx::result r = N.exec_params(query, id);

        if (!r.empty()) {
            Task t;
            t.id = r[0]["id"].as<std::string>();
            t.project_id = r[0]["project_id"].as<std::string>();
            t.title = r[0]["title"].as<std::string>();
            t.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            t.due_date = r[0]["due_date"].is_null() ? std::nullopt : std::make_optional(r[0]["due_date"].as<std::string>());
            t.status = r[0]["status"].as<std::string>();
            t.assigned_to_id = r[0]["assigned_to_id"].is_null() ? std::nullopt : std::make_optional(r[0]["assigned_to_id"].as<std::string>());
            t.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            t.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            return t;
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting task by ID: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving task.");
    }
    return std::nullopt;
}

std::vector<Task> TaskService::getTasksByProjectId(const std::string& project_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<Task> tasks;

    try {
        std::string query = "SELECT id, project_id, title, description, due_date, status, assigned_to_id, created_at, updated_at FROM tasks WHERE project_id = $1 ORDER BY created_at DESC;";
        pqxx::result r = N.exec_params(query, project_id);

        for (const auto& row : r) {
            Task t;
            t.id = row["id"].as<std::string>();
            t.project_id = row["project_id"].as<std::string>();
            t.title = row["title"].as<std::string>();
            t.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
            t.due_date = row["due_date"].is_null() ? std::nullopt : std::make_optional(row["due_date"].as<std::string>());
            t.status = row["status"].as<std::string>();
            t.assigned_to_id = row["assigned_to_id"].is_null() ? std::nullopt : std::make_optional(row["assigned_to_id"].as<std::string>());
            t.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
            t.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
            tasks.push_back(t);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting tasks by project ID: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving tasks for project.");
    }
    return tasks;
}

std::vector<Task> TaskService::getTasksAssignedToUser(const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<Task> tasks;

    try {
        std::string query = "SELECT id, project_id, title, description, due_date, status, assigned_to_id, created_at, updated_at FROM tasks WHERE assigned_to_id = $1 ORDER BY created_at DESC;";
        pqxx::result r = N.exec_params(query, user_id);

        for (const auto& row : r) {
            Task t;
            t.id = row["id"].as<std::string>();
            t.project_id = row["project_id"].as<std::string>();
            t.title = row["title"].as<std::string>();
            t.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
            t.due_date = row["due_date"].is_null() ? std::nullopt : std::make_optional(row["due_date"].as<std::string>());
            t.status = row["status"].as<std::string>();
            t.assigned_to_id = row["assigned_to_id"].is_null() ? std::nullopt : std::make_optional(row["assigned_to_id"].as<std::string>());
            t.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
            t.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
            tasks.push_back(t);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting tasks assigned to user: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving tasks for user.");
    }
    return tasks;
}

Task TaskService::updateTask(const std::string& id, const Task& task_updates) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "UPDATE tasks SET ";
        std::vector<std::string> set_clauses;
        std::vector<pqxx::param_type> params;
        int param_idx = 1;

        if (!task_updates.title.empty()) {
            set_clauses.push_back("title = $" + std::to_string(param_idx++));
            params.push_back(task_updates.title);
        }
        if (task_updates.description.has_value()) {
            set_clauses.push_back("description = $" + std::to_string(param_idx++));
            params.push_back(task_updates.description);
        }
        if (task_updates.due_date.has_value()) {
            set_clauses.push_back("due_date = $" + std::to_string(param_idx++));
            params.push_back(task_updates.due_date);
        }
        if (!task_updates.status.empty()) {
            set_clauses.push_back("status = $" + std::to_string(param_idx++));
            params.push_back(task_updates.status);
        }
        if (task_updates.assigned_to_id.has_value()) {
            set_clauses.push_back("assigned_to_id = $" + std::to_string(param_idx++));
            params.push_back(task_updates.assigned_to_id);
        }

        if (set_clauses.empty()) {
            txn.abort();
            auto existing_task = getTaskById(id);
            if(existing_task) return *existing_task;
            throw TaskNotFoundException("Task not found for update (no fields changed): " + id);
        }

        query += pqxx::to_string(pqxx::join(set_clauses, ", "));
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + std::to_string(param_idx++) + " RETURNING *;";
        params.push_back(id);

        pqxx::result r = txn.exec_params(query, params);

        if (!r.empty()) {
            txn.commit();
            Logger::info("Task updated: {}", id);
            Task t;
            t.id = r[0]["id"].as<std::string>();
            t.project_id = r[0]["project_id"].as<std::string>();
            t.title = r[0]["title"].as<std::string>();
            t.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            t.due_date = r[0]["due_date"].is_null() ? std::nullopt : std::make_optional(r[0]["due_date"].as<std::string>());
            t.status = r[0]["status"].as<std::string>();
            t.assigned_to_id = r[0]["assigned_to_id"].is_null() ? std::nullopt : std::make_optional(r[0]["assigned_to_id"].as<std::string>());
            t.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            t.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            return t;
        }
        throw TaskNotFoundException("Task not found for update: " + id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error updating task: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error updating task.");
    }
}

void TaskService::deleteTask(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "DELETE FROM tasks WHERE id = $1;";
        pqxx::result r = txn.exec_params(query, id);

        if (r.affected_rows() == 0) {
            throw TaskNotFoundException("Task not found for deletion: " + id);
        }
        txn.commit();
        Logger::info("Task deleted: {}", id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error deleting task: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error deleting task.");
    }
}
```