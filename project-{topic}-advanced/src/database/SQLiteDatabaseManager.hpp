```cpp
#ifndef SQLITE_DATABASE_MANAGER_HPP
#define SQLITE_DATABASE_MANAGER_HPP

#include "DatabaseManager.hpp"
#include <sqlite3.h>
#include <mutex>

class SQLiteDatabaseManager : public DatabaseManager {
public:
    SQLiteDatabaseManager(const std::string& db_path);
    ~SQLiteDatabaseManager();

    void open() override;
    void close() override;
    bool isOpen() const override;

    void execute(const std::string& sql) override;
    void query(const std::string& sql, QueryCallback callback = nullptr, void* data = nullptr) override;

    void beginTransaction() override;
    void commitTransaction() override;
    void rollbackTransaction() override;

    // --- User CRUD ---
    int createUser(const User& user) override;
    std::optional<User> getUserById(int id) override;
    std::optional<User> getUserByUsername(const std::string& username) override;
    std::optional<User> getUserByEmail(const std::string& email) override;
    std::vector<User> getAllUsers() override;
    bool updateUser(const User& user) override;
    bool deleteUser(int id) override;

    // --- Project CRUD ---
    int createProject(const Project& project) override;
    std::optional<Project> getProjectById(int id) override;
    std::vector<Project> getAllProjects() override;
    std::vector<Project> getProjectsByOwnerId(int owner_id) override;
    bool updateProject(const Project& project) override;
    bool deleteProject(int id) override;

    // --- Task CRUD ---
    int createTask(const Task& task) override;
    std::optional<Task> getTaskById(int id) override;
    std::vector<Task> getAllTasks() override;
    std::vector<Task> getTasksByProjectId(int project_id) override;
    std::vector<Task> getTasksByAssignedUserId(int user_id) override;
    bool updateTask(const Task& task) override;
    bool deleteTask(int id) override;

    // --- Schema Management (specific to implementation) ---
    void initializeSchema() override; // Runs V1_create_tables.sql implicitly or explicitly
    void runMigrationScript(const std::string& script_path) override;
    void runSeedScript(const std::string& script_path) override;

private:
    std::string db_path_;
    sqlite3* db_;
    std::mutex db_mutex_; // For thread-safe access to SQLite connection

    // Helper to extract user from result row
    static int userCallback(void* data, int argc, char** argv, char** azColName);
    // Helper to extract project from result row
    static int projectCallback(void* data, int argc, char** argv, char** azColName);
    // Helper to extract task from result row
    static int taskCallback(void* data, int argc, char** argv, char** azColName);
    // Helper to execute a statement and return last inserted ID
    long long executeAndGetLastInsertId(const std::string& sql);
    
    // Internal helper for preparing and binding statements
    template<typename... Args>
    void executePreparedStatement(const std::string& sql, Args&&... args);
};

#endif // SQLITE_DATABASE_MANAGER_HPP
```