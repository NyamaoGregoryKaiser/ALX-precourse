```cpp
#include "SQLiteDatabaseManager.hpp"
#include "../utils/Logger.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm> // for std::transform

// Static callback for user data retrieval
int SQLiteDatabaseManager::userCallback(void* data, int argc, char** argv, char** azColName) {
    if (data == nullptr) return 1; // No data context
    auto user_opt_ptr = static_cast<std::optional<User>*>(data);
    *user_opt_ptr = User(
        std::stoi(argv[0] ? argv[0] : "0"), // id
        argv[1] ? argv[1] : "",             // username
        argv[2] ? argv[2] : "",             // email
        argv[3] ? argv[3] : "",             // password_hash
        stringToUserRole(argv[4] ? argv[4] : "USER") // role
    );
    return 0; // Return 0 to continue processing rows
}

// Static callback for project data retrieval
int SQLiteDatabaseManager::projectCallback(void* data, int argc, char** argv, char** azColName) {
    if (data == nullptr) return 1;
    auto project_opt_ptr = static_cast<std::optional<Project>*>(data);
    *project_opt_ptr = Project(
        std::stoi(argv[0] ? argv[0] : "0"), // id
        argv[1] ? argv[1] : "",             // name
        argv[2] ? argv[2] : "",             // description
        (argv[3] ? std::make_optional(std::stoi(argv[3])) : std::nullopt) // owner_id
    );
    return 0;
}

// Static callback for task data retrieval
int SQLiteDatabaseManager::taskCallback(void* data, int argc, char** argv, char** azColName) {
    if (data == nullptr) return 1;
    auto task_opt_ptr = static_cast<std::optional<Task>*>(data);
    *task_opt_ptr = Task(
        std::stoi(argv[0] ? argv[0] : "0"), // id
        argv[1] ? argv[1] : "",             // title
        argv[2] ? argv[2] : "",             // description
        stringToTaskStatus(argv[3] ? argv[3] : "TODO"), // status
        std::stoi(argv[4] ? argv[4] : "0"), // project_id
        (argv[5] ? std::make_optional(std::stoi(argv[5])) : std::nullopt) // assigned_user_id
    );
    return 0;
}


SQLiteDatabaseManager::SQLiteDatabaseManager(const std::string& db_path)
    : db_path_(db_path), db_(nullptr) {
    open(); // Open connection immediately on construction
}

SQLiteDatabaseManager::~SQLiteDatabaseManager() {
    close();
}

void SQLiteDatabaseManager::open() {
    std::lock_guard<std::mutex> lock(db_mutex_);
    if (db_ != nullptr) {
        Logger::log(LogLevel::WARNING, "Database is already open.");
        return;
    }
    int rc = sqlite3_open(db_path_.c_str(), &db_);
    if (rc) {
        std::string error_msg = "Can't open database: " + std::string(sqlite3_errmsg(db_));
        Logger::log(LogLevel::CRITICAL, error_msg);
        sqlite3_close(db_); // Attempt to close if opening failed partially
        db_ = nullptr;
        throw DatabaseException(error_msg);
    }
    Logger::log(LogLevel::INFO, "Opened database successfully: " + db_path_);
    // Enable foreign key constraints
    execute("PRAGMA foreign_keys = ON;");
}

void SQLiteDatabaseManager::close() {
    std::lock_guard<std::mutex> lock(db_mutex_);
    if (db_ != nullptr) {
        sqlite3_close(db_);
        db_ = nullptr;
        Logger::log(LogLevel::INFO, "Closed database: " + db_path_);
    }
}

bool SQLiteDatabaseManager::isOpen() const {
    return db_ != nullptr;
}

void SQLiteDatabaseManager::execute(const std::string& sql) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    char* err_msg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &err_msg);
    if (rc != SQLITE_OK) {
        std::string error_msg = "SQL error: " + std::string(err_msg) + " in statement: " + sql;
        Logger::log(LogLevel::ERROR, error_msg);
        sqlite3_free(err_msg);
        throw DatabaseException(error_msg);
    }
    sqlite3_free(err_msg);
}

long long SQLiteDatabaseManager::executeAndGetLastInsertId(const std::string& sql) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    char* err_msg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &err_msg);
    if (rc != SQLITE_OK) {
        std::string error_msg = "SQL error (insert): " + std::string(err_msg) + " in statement: " + sql;
        Logger::log(LogLevel::ERROR, error_msg);
        sqlite3_free(err_msg);
        throw DatabaseException(error_msg);
    }
    sqlite3_free(err_msg);
    return sqlite3_last_insert_rowid(db_);
}

void SQLiteDatabaseManager::query(const std::string& sql, QueryCallback callback, void* data) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    char* err_msg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), callback ? [](void* cb_data, int argc, char** argv, char** azColName){
        return static_cast<QueryCallback*>(cb_data)->operator()(cb_data, argc, argv, azColName);
    } : nullptr, callback ? &callback : nullptr, &err_msg); // Pass actual callback pointer for context
    
    if (rc != SQLITE_OK && rc != SQLITE_DONE) { // SQLITE_DONE can be returned for successful non-SELECT statements
        std::string error_msg = "SQL error (query): " + std::string(err_msg) + " in statement: " + sql;
        Logger::log(LogLevel::ERROR, error_msg);
        sqlite3_free(err_msg);
        throw DatabaseException(error_msg);
    }
    sqlite3_free(err_msg);
}

void SQLiteDatabaseManager::beginTransaction() {
    execute("BEGIN TRANSACTION;");
}

void SQLiteDatabaseManager::commitTransaction() {
    execute("COMMIT;");
}

void SQLiteDatabaseManager::rollbackTransaction() {
    execute("ROLLBACK;");
}

void SQLiteDatabaseManager::initializeSchema() {
    // Check if tables exist, if not, run V1_create_tables.sql
    // A simple check could be to try selecting from a key table.
    // Or, better, use a `schema_version` table for actual migrations.
    // For this example, we just run the V1 script if it's not present.
    // In a real system, you'd track schema versions.
    try {
        std::string check_table_sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='users';";
        std::string table_name;
        query(check_table_sql, [](void* data, int argc, char** argv, char** azColName){
            if (argc > 0 && argv[0]) {
                *static_cast<std::string*>(data) = argv[0];
            }
            return 0;
        }, &table_name);

        if (table_name.empty()) {
            Logger::log(LogLevel::INFO, "Database tables not found. Running initial schema migration.");
            runMigrationScript("db/migrations/V1_create_tables.sql");
        } else {
            Logger::log(LogLevel::INFO, "Database tables already exist. Skipping initial schema creation.");
        }
        
        // Also run V2 as a sequential migration
        std::string check_v2_migration_sql = "SELECT role FROM users LIMIT 1;"; // V2 adds role
        try {
             query(check_v2_migration_sql, [](void* data, int argc, char** argv, char** azColName){
                // If this query succeeds, roles probably exist, skip V2
                return 0;
             });
             Logger::log(LogLevel::INFO, "V2 migration (roles) might already be applied or not needed.");
        } catch (const DatabaseException& e) {
            // If the query fails (e.g., no 'role' column), run V2
            Logger::log(LogLevel::INFO, "V2 migration (roles) not applied. Running V2_add_admin_role.sql.");
            runMigrationScript("db/migrations/V2_add_admin_role.sql");
        }


    } catch (const CustomException& e) {
        Logger::log(LogLevel::ERROR, "Error checking or initializing database schema: " + std::string(e.what()));
        throw;
    }
}


void SQLiteDatabaseManager::runMigrationScript(const std::string& script_path) {
    std::ifstream file(script_path);
    if (!file.is_open()) {
        Logger::log(LogLevel::CRITICAL, "Failed to open migration script: " + script_path);
        throw DatabaseException("Failed to open migration script: " + script_path);
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string sql_script = buffer.str();

    try {
        execute(sql_script);
        Logger::log(LogLevel::INFO, "Executed migration script: " + script_path);
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::CRITICAL, "Error executing migration script " + script_path + ": " + e.what());
        throw;
    }
}

void SQLiteDatabaseManager::runSeedScript(const std::string& script_path) {
    std::ifstream file(script_path);
    if (!file.is_open()) {
        Logger::log(LogLevel::CRITICAL, "Failed to open seed script: " + script_path);
        throw DatabaseException("Failed to open seed script: " + script_path);
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string sql_script = buffer.str();

    try {
        execute(sql_script);
        Logger::log(LogLevel::INFO, "Executed seed script: " + script_path);
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::CRITICAL, "Error executing seed script " + script_path + ": " + e.what());
        throw;
    }
}


// --- User CRUD ---
int SQLiteDatabaseManager::createUser(const User& user) {
    std::string sql = "INSERT INTO users (username, email, password_hash, role) VALUES ('" +
                      user.username + "', '" + user.email + "', '" + user.password_hash + "', '" + userRoleToString(user.role) + "');";
    long long id = executeAndGetLastInsertId(sql);
    Logger::log(LogLevel::INFO, "Created user with ID: " + std::to_string(id));
    return static_cast<int>(id);
}

std::optional<User> SQLiteDatabaseManager::getUserById(int id) {
    std::string sql = "SELECT id, username, email, password_hash, role FROM users WHERE id = " + std::to_string(id) + ";";
    std::optional<User> user;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        return SQLiteDatabaseManager::userCallback(data, argc, argv, azColName);
    };
    query(sql, cb, &user);
    if (user.has_value()) {
        Logger::log(LogLevel::DEBUG, "Retrieved user by ID: " + std::to_string(id));
    } else {
        Logger::log(LogLevel::DEBUG, "User with ID " + std::to_string(id) + " not found.");
    }
    return user;
}

std::optional<User> SQLiteDatabaseManager::getUserByUsername(const std::string& username) {
    std::string sql = "SELECT id, username, email, password_hash, role FROM users WHERE username = '" + username + "';";
    std::optional<User> user;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        return SQLiteDatabaseManager::userCallback(data, argc, argv, azColName);
    };
    query(sql, cb, &user);
    if (user.has_value()) {
        Logger::log(LogLevel::DEBUG, "Retrieved user by username: " + username);
    } else {
        Logger::log(LogLevel::DEBUG, "User with username " + username + " not found.");
    }
    return user;
}

std::optional<User> SQLiteDatabaseManager::getUserByEmail(const std::string& email) {
    std::string sql = "SELECT id, username, email, password_hash, role FROM users WHERE email = '" + email + "';";
    std::optional<User> user;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        return SQLiteDatabaseManager::userCallback(data, argc, argv, azColName);
    };
    query(sql, cb, &user);
    if (user.has_value()) {
        Logger::log(LogLevel::DEBUG, "Retrieved user by email: " + email);
    } else {
        Logger::log(LogLevel::DEBUG, "User with email " + email + " not found.");
    }
    return user;
}


std::vector<User> SQLiteDatabaseManager::getAllUsers() {
    std::string sql = "SELECT id, username, email, password_hash, role FROM users;";
    std::vector<User> users;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        auto users_vec_ptr = static_cast<std::vector<User>*>(data);
        users_vec_ptr->emplace_back(
            std::stoi(argv[0] ? argv[0] : "0"),
            argv[1] ? argv[1] : "",
            argv[2] ? argv[2] : "",
            argv[3] ? argv[3] : "",
            stringToUserRole(argv[4] ? argv[4] : "USER")
        );
        return 0;
    };
    query(sql, cb, &users);
    Logger::log(LogLevel::DEBUG, "Retrieved all " + std::to_string(users.size()) + " users.");
    return users;
}

bool SQLiteDatabaseManager::updateUser(const User& user) {
    if (!user.id.has_value()) {
        Logger::log(LogLevel::ERROR, "Cannot update user: ID is missing.");
        throw DatabaseException("User ID is required for update.");
    }
    std::string sql = "UPDATE users SET username = '" + user.username + "', email = '" + user.email +
                      "', password_hash = '" + user.password_hash + "', role = '" + userRoleToString(user.role) +
                      "' WHERE id = " + std::to_string(user.id.value()) + ";";
    execute(sql);
    Logger::log(LogLevel::INFO, "Updated user with ID: " + std::to_string(user.id.value()));
    return true; // If execute doesn't throw, it's considered successful
}

bool SQLiteDatabaseManager::deleteUser(int id) {
    std::string sql = "DELETE FROM users WHERE id = " + std::to_string(id) + ";";
    execute(sql);
    Logger::log(LogLevel::INFO, "Deleted user with ID: " + std::to_string(id));
    return true;
}

// --- Project CRUD ---
int SQLiteDatabaseManager::createProject(const Project& project) {
    std::string owner_id_str = project.owner_id.has_value() ? std::to_string(project.owner_id.value()) : "NULL";
    std::string sql = "INSERT INTO projects (name, description, owner_id) VALUES ('" +
                      project.name + "', '" + project.description + "', " + owner_id_str + ");";
    long long id = executeAndGetLastInsertId(sql);
    Logger::log(LogLevel::INFO, "Created project with ID: " + std::to_string(id));
    return static_cast<int>(id);
}

std::optional<Project> SQLiteDatabaseManager::getProjectById(int id) {
    std::string sql = "SELECT id, name, description, owner_id FROM projects WHERE id = " + std::to_string(id) + ";";
    std::optional<Project> project;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        return SQLiteDatabaseManager::projectCallback(data, argc, argv, azColName);
    };
    query(sql, cb, &project);
    if (project.has_value()) {
        Logger::log(LogLevel::DEBUG, "Retrieved project by ID: " + std::to_string(id));
    } else {
        Logger::log(LogLevel::DEBUG, "Project with ID " + std::to_string(id) + " not found.");
    }
    return project;
}

std::vector<Project> SQLiteDatabaseManager::getAllProjects() {
    std::string sql = "SELECT id, name, description, owner_id FROM projects;";
    std::vector<Project> projects;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        auto projects_vec_ptr = static_cast<std::vector<Project>*>(data);
        projects_vec_ptr->emplace_back(
            std::stoi(argv[0] ? argv[0] : "0"),
            argv[1] ? argv[1] : "",
            argv[2] ? argv[2] : "",
            (argv[3] ? std::make_optional(std::stoi(argv[3])) : std::nullopt)
        );
        return 0;
    };
    query(sql, cb, &projects);
    Logger::log(LogLevel::DEBUG, "Retrieved all " + std::to_string(projects.size()) + " projects.");
    return projects;
}

std::vector<Project> SQLiteDatabaseManager::getProjectsByOwnerId(int owner_id) {
    std::string sql = "SELECT id, name, description, owner_id FROM projects WHERE owner_id = " + std::to_string(owner_id) + ";";
    std::vector<Project> projects;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        auto projects_vec_ptr = static_cast<std::vector<Project>*>(data);
        projects_vec_ptr->emplace_back(
            std::stoi(argv[0] ? argv[0] : "0"),
            argv[1] ? argv[1] : "",
            argv[2] ? argv[2] : "",
            (argv[3] ? std::make_optional(std::stoi(argv[3])) : std::nullopt)
        );
        return 0;
    };
    query(sql, cb, &projects);
    Logger::log(LogLevel::DEBUG, "Retrieved " + std::to_string(projects.size()) + " projects for owner ID: " + std::to_string(owner_id));
    return projects;
}

bool SQLiteDatabaseManager::updateProject(const Project& project) {
    if (!project.id.has_value()) {
        Logger::log(LogLevel::ERROR, "Cannot update project: ID is missing.");
        throw DatabaseException("Project ID is required for update.");
    }
    std::string owner_id_str = project.owner_id.has_value() ? std::to_string(project.owner_id.value()) : "NULL";
    std::string sql = "UPDATE projects SET name = '" + project.name + "', description = '" + project.description +
                      "', owner_id = " + owner_id_str +
                      " WHERE id = " + std::to_string(project.id.value()) + ";";
    execute(sql);
    Logger::log(LogLevel::INFO, "Updated project with ID: " + std::to_string(project.id.value()));
    return true;
}

bool SQLiteDatabaseManager::deleteProject(int id) {
    std::string sql = "DELETE FROM projects WHERE id = " + std::to_string(id) + ";";
    execute(sql);
    Logger::log(LogLevel::INFO, "Deleted project with ID: " + std::to_string(id));
    return true;
}

// --- Task CRUD ---
int SQLiteDatabaseManager::createTask(const Task& task) {
    std::string assigned_user_id_str = task.assigned_user_id.has_value() ? std::to_string(task.assigned_user_id.value()) : "NULL";
    std::string sql = "INSERT INTO tasks (title, description, status, project_id, assigned_user_id) VALUES ('" +
                      task.title + "', '" + task.description + "', '" + taskStatusToString(task.status) + "', " +
                      std::to_string(task.project_id) + ", " + assigned_user_id_str + ");";
    long long id = executeAndGetLastInsertId(sql);
    Logger::log(LogLevel::INFO, "Created task with ID: " + std::to_string(id) + " for project " + std::to_string(task.project_id));
    return static_cast<int>(id);
}

std::optional<Task> SQLiteDatabaseManager::getTaskById(int id) {
    std::string sql = "SELECT id, title, description, status, project_id, assigned_user_id FROM tasks WHERE id = " + std::to_string(id) + ";";
    std::optional<Task> task;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        return SQLiteDatabaseManager::taskCallback(data, argc, argv, azColName);
    };
    query(sql, cb, &task);
    if (task.has_value()) {
        Logger::log(LogLevel::DEBUG, "Retrieved task by ID: " + std::to_string(id));
    } else {
        Logger::log(LogLevel::DEBUG, "Task with ID " + std::to_string(id) + " not found.");
    }
    return task;
}

std::vector<Task> SQLiteDatabaseManager::getAllTasks() {
    std::string sql = "SELECT id, title, description, status, project_id, assigned_user_id FROM tasks;";
    std::vector<Task> tasks;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        auto tasks_vec_ptr = static_cast<std::vector<Task>*>(data);
        tasks_vec_ptr->emplace_back(
            std::stoi(argv[0] ? argv[0] : "0"),
            argv[1] ? argv[1] : "",
            argv[2] ? argv[2] : "",
            stringToTaskStatus(argv[3] ? argv[3] : "TODO"),
            std::stoi(argv[4] ? argv[4] : "0"),
            (argv[5] ? std::make_optional(std::stoi(argv[5])) : std::nullopt)
        );
        return 0;
    };
    query(sql, cb, &tasks);
    Logger::log(LogLevel::DEBUG, "Retrieved all " + std::to_string(tasks.size()) + " tasks.");
    return tasks;
}

std::vector<Task> SQLiteDatabaseManager::getTasksByProjectId(int project_id) {
    std::string sql = "SELECT id, title, description, status, project_id, assigned_user_id FROM tasks WHERE project_id = " + std::to_string(project_id) + ";";
    std::vector<Task> tasks;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        auto tasks_vec_ptr = static_cast<std::vector<Task>*>(data);
        tasks_vec_ptr->emplace_back(
            std::stoi(argv[0] ? argv[0] : "0"),
            argv[1] ? argv[1] : "",
            argv[2] ? argv[2] : "",
            stringToTaskStatus(argv[3] ? argv[3] : "TODO"),
            std::stoi(argv[4] ? argv[4] : "0"),
            (argv[5] ? std::make_optional(std::stoi(argv[5])) : std::nullopt)
        );
        return 0;
    };
    query(sql, cb, &tasks);
    Logger::log(LogLevel::DEBUG, "Retrieved " + std::to_string(tasks.size()) + " tasks for project ID: " + std::to_string(project_id));
    return tasks;
}

std::vector<Task> SQLiteDatabaseManager::getTasksByAssignedUserId(int user_id) {
    std::string sql = "SELECT id, title, description, status, project_id, assigned_user_id FROM tasks WHERE assigned_user_id = " + std::to_string(user_id) + ";";
    std::vector<Task> tasks;
    QueryCallback cb = [](void* data, int argc, char** argv, char** azColName) {
        auto tasks_vec_ptr = static_cast<std::vector<Task>*>(data);
        tasks_vec_ptr->emplace_back(
            std::stoi(argv[0] ? argv[0] : "0"),
            argv[1] ? argv[1] : "",
            argv[2] ? argv[2] : "",
            stringToTaskStatus(argv[3] ? argv[3] : "TODO"),
            std::stoi(argv[4] ? argv[4] : "0"),
            (argv[5] ? std::make_optional(std::stoi(argv[5])) : std::nullopt)
        );
        return 0;
    };
    query(sql, cb, &tasks);
    Logger::log(LogLevel::DEBUG, "Retrieved " + std::to_string(tasks.size()) + " tasks for assigned user ID: " + std::to_string(user_id));
    return tasks;
}

bool SQLiteDatabaseManager::updateTask(const Task& task) {
    if (!task.id.has_value()) {
        Logger::log(LogLevel::ERROR, "Cannot update task: ID is missing.");
        throw DatabaseException("Task ID is required for update.");
    }
    std::string assigned_user_id_str = task.assigned_user_id.has_value() ? std::to_string(task.assigned_user_id.value()) : "NULL";
    std::string sql = "UPDATE tasks SET title = '" + task.title + "', description = '" + task.description +
                      "', status = '" + taskStatusToString(task.status) + "', project_id = " + std::to_string(task.project_id) +
                      ", assigned_user_id = " + assigned_user_id_str +
                      " WHERE id = " + std::to_string(task.id.value()) + ";";
    execute(sql);
    Logger::log(LogLevel::INFO, "Updated task with ID: " + std::to_string(task.id.value()));
    return true;
}

bool SQLiteDatabaseManager::deleteTask(int id) {
    std::string sql = "DELETE FROM tasks WHERE id = " + std::to_string(id) + ";";
    execute(sql);
    Logger::log(LogLevel::INFO, "Deleted task with ID: " + std::to_string(id));
    return true;
}
```