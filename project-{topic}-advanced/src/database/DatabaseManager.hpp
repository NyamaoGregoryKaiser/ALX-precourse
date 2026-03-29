```cpp
#ifndef DATABASE_MANAGER_HPP
#define DATABASE_MANAGER_HPP

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include "../models/User.hpp"
#include "../models/Project.hpp"
#include "../models/Task.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include "../utils/Logger.hpp" // Include Logger

// Generic callback for database results (e.g., SELECT queries)
// Params: void* (data pointer for context), int (number of columns), char** (column values), char** (column names)
using QueryCallback = std::function<int(void*, int, char**, char**)>;

class DatabaseManager {
public:
    virtual ~DatabaseManager() = default;

    // --- Connection Management ---
    virtual void open() = 0;
    virtual void close() = 0;
    virtual bool isOpen() const = 0;

    // --- Query Execution ---
    // Execute a non-SELECT SQL statement (INSERT, UPDATE, DELETE, CREATE TABLE)
    virtual void execute(const std::string& sql) = 0;
    // Execute a SELECT SQL statement, with an optional callback to process results
    virtual void query(const std::string& sql, QueryCallback callback = nullptr, void* data = nullptr) = 0;

    // --- Transaction Management ---
    virtual void beginTransaction() = 0;
    virtual void commitTransaction() = 0;
    virtual void rollbackTransaction() = 0;

    // --- User CRUD ---
    virtual int createUser(const User& user) = 0; // Returns new user ID
    virtual std::optional<User> getUserById(int id) = 0;
    virtual std::optional<User> getUserByUsername(const std::string& username) = 0;
    virtual std::optional<User> getUserByEmail(const std::string& email) = 0;
    virtual std::vector<User> getAllUsers() = 0;
    virtual bool updateUser(const User& user) = 0;
    virtual bool deleteUser(int id) = 0;

    // --- Project CRUD ---
    virtual int createProject(const Project& project) = 0; // Returns new project ID
    virtual std::optional<Project> getProjectById(int id) = 0;
    virtual std::vector<Project> getAllProjects() = 0;
    virtual std::vector<Project> getProjectsByOwnerId(int owner_id) = 0;
    virtual bool updateProject(const Project& project) = 0;
    virtual bool deleteProject(int id) = 0;

    // --- Task CRUD ---
    virtual int createTask(const Task& task) = 0; // Returns new task ID
    virtual std::optional<Task> getTaskById(int id) = 0;
    virtual std::vector<Task> getAllTasks() = 0;
    virtual std::vector<Task> getTasksByProjectId(int project_id) = 0;
    virtual std::vector<Task> getTasksByAssignedUserId(int user_id) = 0;
    virtual bool updateTask(const Task& task) = 0;
    virtual bool deleteTask(int id) = 0;

    // --- Schema Management (specific to implementation) ---
    virtual void initializeSchema() = 0;
    virtual void runMigrationScript(const std::string& script_path) = 0;
    virtual void runSeedScript(const std::string& script_path) = 0;
};

#endif // DATABASE_MANAGER_HPP
```