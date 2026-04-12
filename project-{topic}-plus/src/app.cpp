#include "app.h"
#include <fstream> // For checking if .env exists
#include "src/models/user.h" // For schema creation
#include "src/models/task.h" // For schema creation

Application::Application() {
    // Attempt to load .env variables first if file exists
    std::ifstream env_file(".env");
    if (env_file.is_open()) {
        Config::set_env_from_file(".env");
        env_file.close();
    } else {
        LOG_WARN("'.env' file not found. Relying on system environment variables or defaults.");
    }

    // Initialize the logger early
    Logger::Logger::getInstance().init(Config::LOG_FILE_PATH, Logger::string_to_level(Config::LOG_LEVEL_STR));
    LOG_INFO("Application initialized.");
}

Application::~Application() {
    DatabaseManager::getInstance().close();
    LOG_INFO("Application shutdown complete.");
}

void Application::init() {
    LOG_INFO("Initializing application components...");

    // Initialize DatabaseManager
    DatabaseManager::getInstance().init(Config::DATABASE_PATH);
    
    // Initialize HttpRestServer
    Pistache::Address addr(Config::APP_HOST, Pistache::Port(Config::APP_PORT));
    api_server_ = std::make_unique<HttpRestServer>(addr);
    api_server_->init(4); // Use 4 threads for the HTTP server
}

void Application::start_server() {
    if (!api_server_) {
        LOG_ERROR("API Server not initialized. Call init() first.");
        return;
    }
    LOG_INFO("Starting API server on " + Config::APP_HOST + ":" + std::to_string(Config::APP_PORT));
    api_server_->start();
}

void Application::run_migrations() {
    LOG_INFO("Running database migrations...");
    DatabaseManager& db = DatabaseManager::getInstance();

    // Table for schema versioning
    db.execute("CREATE TABLE IF NOT EXISTS schema_versions ("
               "id INTEGER PRIMARY KEY AUTOINCREMENT,"
               "version TEXT NOT NULL UNIQUE,"
               "applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
               ");");

    // Check if migration 001_initial_schema has been applied
    std::vector<DbRow> rows = db.query("SELECT version FROM schema_versions WHERE version = '001_initial_schema';");

    if (rows.empty()) {
        LOG_INFO("Applying migration: 001_initial_schema");
        std::string schema_sql = R"(
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
                due_date TEXT, -- YYYY-MM-DD format
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
        )";
        db.execute(schema_sql);
        db.execute("INSERT INTO schema_versions (version) VALUES ('001_initial_schema');");
        LOG_INFO("Migration 001_initial_schema applied successfully.");
    } else {
        LOG_INFO("Migration 001_initial_schema already applied. Skipping.");
    }

    // Add more migrations here as needed
    // Example:
    // rows = db.query("SELECT version FROM schema_versions WHERE version = '002_add_task_priority';");
    // if (rows.empty()) {
    //     LOG_INFO("Applying migration: 002_add_task_priority");
    //     db.execute("ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0;");
    //     db.execute("INSERT INTO schema_versions (version) VALUES ('002_add_task_priority');");
    //     LOG_INFO("Migration 002_add_task_priority applied successfully.");
    // } else {
    //     LOG_INFO("Migration 002_add_task_priority already applied. Skipping.");
    // }

    LOG_INFO("All migrations checked.");
}

void Application::run_seeders() {
    LOG_INFO("Running database seeders...");
    AuthService auth_service; // Temporary service for hashing

    // Seed Admin User
    std::optional<User> admin_user = User::find_by_username(Config::DEFAULT_ADMIN_USERNAME);
    if (!admin_user) {
        LOG_INFO("Seeding default admin user...");
        try {
            User::create(Config::DEFAULT_ADMIN_USERNAME, auth_service.hash_password(Config::DEFAULT_ADMIN_PASSWORD), UserRole::ADMIN);
            LOG_INFO("Default admin user '" + Config::DEFAULT_ADMIN_USERNAME + "' seeded successfully.");
        } catch (const ConflictException& e) {
            LOG_WARN("Admin user '" + Config::DEFAULT_ADMIN_USERNAME + "' already exists, skipping seed.");
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to seed default admin user: " + std::string(e.what()));
        }
    } else {
        LOG_INFO("Default admin user '" + Config::DEFAULT_ADMIN_USERNAME + "' already exists. Skipping seed.");
    }

    // You can add more seed data here, e.g., sample tasks for the admin user
    // if (admin_user) {
    //     std::vector<Task> admin_tasks = Task::find_by_user_id(admin_user->id);
    //     if (admin_tasks.empty()) {
    //         LOG_INFO("Seeding sample tasks for admin user...");
    //         Task::create("Setup project", "Initialize C++ project with all dependencies.", TaskStatus::COMPLETED, "2023-01-01", admin_user->id);
    //         Task::create("Implement API endpoints", "Develop CRUD operations for tasks.", TaskStatus::IN_PROGRESS, "2023-12-31", admin_user->id);
    //         LOG_INFO("Sample tasks seeded for admin user.");
    //     } else {
    //         LOG_INFO("Sample tasks for admin user already exist. Skipping seed.");
    //     }
    // }

    LOG_INFO("All seeders checked.");
}
```