```cpp
#include "gtest/gtest.h"
#include "db/Database.h"
#include "services/TaskService.h"
#include "services/UserService.h"
#include "models/User.h"
#include "models/Task.h"
#include "config/Config.h"
#include "utils/Logger.h"

// Mock Config for database connection
namespace Config {
    std::map<std::string, std::string> mock_config;
    void load(const std::string&) {
        // Use environment variables or default for testing
        mock_config["DB_HOST"] = getenv("DB_HOST") ? getenv("DB_HOST") : "localhost";
        mock_config["DB_USER"] = getenv("DB_USER") ? getenv("DB_USER") : "test_user";
        mock_config["DB_PASSWORD"] = getenv("DB_PASSWORD") ? getenv("DB_PASSWORD") : "test_password";
        mock_config["DB_NAME"] = getenv("DB_NAME") ? getenv("DB_NAME") : "test_db";
        mock_config["DB_PORT"] = getenv("DB_PORT") ? getenv("DB_PORT") : "5432";
        mock_config["JWT_SECRET"] = getenv("JWT_SECRET") ? getenv("JWT_SECRET") : "test-secret";
        mock_config["JWT_EXPIRATION_SECONDS"] = "3600";
    }
    template <typename T> T get(const std::string& key, const T& defaultValue) {
        if (mock_config.count(key)) {
            if constexpr (std::is_same_v<T, std::string>) return mock_config[key];
            if constexpr (std::is_same_v<T, int>) return std::stoi(mock_config[key]);
        }
        return defaultValue;
    }
    template <typename T> T get(const std::string& key) {
        if (mock_config.count(key)) {
            if constexpr (std::is_same_v<T, std::string>) return mock_config[key];
            if constexpr (std::is_same_v<T, int>) return std::stoi(mock_config[key]);
        }
        throw std::runtime_error("Config key not found in mock: " + key);
    }
    bool isLoaded() { return true; }
    void clear() { mock_config.clear(); }
}

class TaskServiceIntegrationTest : public ::testing::Test {
protected:
    static void SetUpTestSuite() {
        Logger::init();
        Config::load(""); // Load mock config
        Database::initPool(
            Config::get<std::string>("DB_HOST"),
            Config::get<std::string>("DB_USER"),
            Config::get<std::string>("DB_PASSWORD"),
            Config::get<std::string>("DB_NAME"),
            Config::get<int>("DB_PORT", 5432)
        );
        LOG_INFO("Database pool initialized for integration tests.");

        // Ensure a clean state for testing
        auto conn = Database::getConnection();
        try {
            pqxx::work txn(*conn);
            txn.exec("DROP TABLE IF EXISTS tasks CASCADE;");
            txn.exec("DROP TYPE IF EXISTS task_status CASCADE;");
            txn.exec("DROP TABLE IF EXISTS users CASCADE;");
            txn.exec("DROP TABLE IF EXISTS schema_migrations CASCADE;");
            txn.commit();
            LOG_INFO("Cleaned up previous test tables.");
        } catch (const pqxx::pqxx_exception& e) {
            LOG_ERROR("Error during test setup cleanup: {}", e.what());
            // Proceed, as tables might not exist
        }
        Database::releaseConnection(conn);

        // Run migrations to set up schema for tests
        Database::runMigrations("src/db/migrations");
        LOG_INFO("Migrations applied for integration tests.");
    }

    static void TearDownTestSuite() {
        // Clean up data after all tests
        auto conn = Database::getConnection();
        try {
            pqxx::work txn(*conn);
            txn.exec("DELETE FROM tasks;");
            txn.exec("DELETE FROM users;");
            txn.commit();
            LOG_INFO("Cleaned up all data after integration tests.");
        } catch (const pqxx::pqxx_exception& e) {
            LOG_ERROR("Error during test teardown cleanup: {}", e.what());
        }
        Database::releaseConnection(conn);

        Database::shutdownPool();
        LOG_INFO("Database pool shut down after integration tests.");
        Config::clear();
    }

    // Per-test setup: Register a user for each test to ensure isolation
    long test_user_id;
    std::string test_username;

    void SetUp() override {
        test_username = "user_" + std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count());
        User newUser;
        newUser.username = test_username;
        newUser.email = test_username + "@example.com";
        newUser.password_hash = "hashed_password"; // Placeholder, real hash in UserService
        
        try {
            User registeredUser = UserService::registerUser(newUser, "testpassword");
            test_user_id = registeredUser.id;
        } catch (const std::exception& e) {
            FAIL() << "Failed to register test user: " << e.what();
        }
    }

    void TearDown() override {
        // Delete tasks and user created in this test
        auto conn = Database::getConnection();
        try {
            pqxx::work txn(*conn);
            txn.exec_params("DELETE FROM tasks WHERE user_id = $1;", test_user_id);
            txn.exec_params("DELETE FROM users WHERE id = $1;", test_user_id);
            txn.commit();
        } catch (const pqxx::pqxx_exception& e) {
            LOG_ERROR("Error during per-test cleanup: {}", e.what());
        }
        Database::releaseConnection(conn);
    }
};

TEST_F(TaskServiceIntegrationTest, CreateAndRetrieveTask) {
    Task newTask;
    newTask.userId = test_user_id;
    newTask.title = "Test Task 1";
    newTask.description = "Description for test task 1.";
    newTask.status = "TODO";

    Task createdTask = TaskService::createTask(newTask);
    ASSERT_GT(createdTask.id, 0);
    ASSERT_EQ(createdTask.title, "Test Task 1");
    ASSERT_EQ(createdTask.userId, test_user_id);

    std::optional<Task> retrievedTask = TaskService::getTaskById(createdTask.id, test_user_id);
    ASSERT_TRUE(retrievedTask.has_value());
    ASSERT_EQ(retrievedTask->id, createdTask.id);
    ASSERT_EQ(retrievedTask->title, createdTask.title);
}

TEST_F(TaskServiceIntegrationTest, RetrieveAllTasksForUser) {
    Task newTask1;
    newTask1.userId = test_user_id;
    newTask1.title = "User Task A";
    newTask1.status = "TODO";
    TaskService::createTask(newTask1);

    Task newTask2;
    newTask2.userId = test_user_id;
    newTask2.title = "User Task B";
    newTask2.status = "IN_PROGRESS";
    TaskService::createTask(newTask2);

    std::vector<Task> tasks = TaskService::getTasksByUserId(test_user_id);
    ASSERT_EQ(tasks.size(), 2);
    // Check if the titles are present
    bool foundA = false, foundB = false;
    for (const auto& task : tasks) {
        if (task.title == "User Task A") foundA = true;
        if (task.title == "User Task B") foundB = true;
    }
    ASSERT_TRUE(foundA);
    ASSERT_TRUE(foundB);
}

TEST_F(TaskServiceIntegrationTest, UpdateTask) {
    Task newTask;
    newTask.userId = test_user_id;
    newTask.title = "Original Title";
    newTask.status = "TODO";
    Task createdTask = TaskService::createTask(newTask);

    createdTask.title = "Updated Title";
    createdTask.description = "New description";
    createdTask.status = "DONE";
    
    Task updatedTask = TaskService::updateTask(createdTask.id, test_user_id, createdTask);
    
    ASSERT_EQ(updatedTask.id, createdTask.id);
    ASSERT_EQ(updatedTask.title, "Updated Title");
    ASSERT_EQ(updatedTask.description, "New description");
    ASSERT_EQ(updatedTask.status, "DONE");

    std::optional<Task> retrievedTask = TaskService::getTaskById(updatedTask.id, test_user_id);
    ASSERT_TRUE(retrievedTask.has_value());
    ASSERT_EQ(retrievedTask->title, "Updated Title");
    ASSERT_EQ(retrievedTask->status, "DONE");
}

TEST_F(TaskServiceIntegrationTest, DeleteTask) {
    Task newTask;
    newTask.userId = test_user_id;
    newTask.title = "Task to Delete";
    newTask.status = "TODO";
    Task createdTask = TaskService::createTask(newTask);

    bool deleted = TaskService::deleteTask(createdTask.id, test_user_id);
    ASSERT_TRUE(deleted);

    std::optional<Task> retrievedTask = TaskService::getTaskById(createdTask.id, test_user_id);
    ASSERT_FALSE(retrievedTask.has_value()); // Should not find the task
}

TEST_F(TaskServiceIntegrationTest, GetTaskByIdNotFound) {
    std::optional<Task> task = TaskService::getTaskById(99999, test_user_id); // Non-existent ID
    ASSERT_FALSE(task.has_value());
}

TEST_F(TaskServiceIntegrationTest, UpdateTaskNotFoundOrWrongUser) {
    Task newTask;
    newTask.userId = test_user_id;
    newTask.title = "Original Title";
    newTask.status = "TODO";
    Task createdTask = TaskService::createTask(newTask);

    Task updateData = createdTask;
    updateData.title = "Attempted Update";

    // Attempt to update with wrong user ID
    ASSERT_THROW(TaskService::updateTask(createdTask.id, test_user_id + 1, updateData), std::runtime_error); // Should fail
    
    // Attempt to update non-existent task
    ASSERT_THROW(TaskService::updateTask(99999, test_user_id, updateData), std::runtime_error); // Should fail

    // Verify original task is unchanged
    std::optional<Task> originalTask = TaskService::getTaskById(createdTask.id, test_user_id);
    ASSERT_TRUE(originalTask.has_value());
    ASSERT_EQ(originalTask->title, "Original Title");
}

TEST_F(TaskServiceIntegrationTest, DeleteTaskNotFoundOrWrongUser) {
    Task newTask;
    newTask.userId = test_user_id;
    newTask.title = "Task to be protected";
    newTask.status = "TODO";
    Task createdTask = TaskService::createTask(newTask);

    // Attempt to delete with wrong user ID
    bool deletedWrongUser = TaskService::deleteTask(createdTask.id, test_user_id + 1);
    ASSERT_FALSE(deletedWrongUser);

    // Attempt to delete non-existent task
    bool deletedNonExistent = TaskService::deleteTask(99999, test_user_id);
    ASSERT_FALSE(deletedNonExistent);

    // Verify original task still exists
    std::optional<Task> originalTask = TaskService::getTaskById(createdTask.id, test_user_id);
    ASSERT_TRUE(originalTask.has_value());
}
```