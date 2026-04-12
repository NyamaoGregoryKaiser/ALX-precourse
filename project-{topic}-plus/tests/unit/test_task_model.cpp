#include <gtest/gtest.h>
#include "src/models/task.h"
#include "src/database/database_manager.h"
#include "src/config/config.h"
#include "src/utils/exceptions.h"
#include "src/utils/logger.h"
#include <fstream>

// Fixture for Task model tests
class TaskModelTest : public ::testing::Test {
protected:
    DatabaseManager& db_manager = DatabaseManager::getInstance();
    std::string test_db_path = "./data/test_task.db"; // Unique DB for this test suite
    long test_user_id = 1; // A dummy user ID for foreign key constraints

    void SetUp() override {
        // Initialize logger for tests
        Logger::Logger::getInstance().init("./logs/test_task_model.log", Logger::Level::WARN);

        std::remove(test_db_path.c_str());
        db_manager.init(test_db_path);
        // Create schema with a dummy users table for FK
        db_manager.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, role TEXT, created_at TEXT, updated_at TEXT);");
        db_manager.execute("INSERT INTO users (username, password_hash, role, created_at, updated_at) VALUES ('dummy_user', 'hash', 'user', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');");
        test_user_id = db_manager.last_insert_rowid();

        db_manager.execute("CREATE TABLE IF NOT EXISTS tasks ("
                           "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                           "title TEXT NOT NULL,"
                           "description TEXT,"
                           "status TEXT NOT NULL DEFAULT 'pending',"
                           "due_date TEXT,"
                           "user_id INTEGER NOT NULL,"
                           "created_at TEXT NOT NULL,"
                           "updated_at TEXT NOT NULL,"
                           "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
                           ");");
    }

    void TearDown() override {
        db_manager.close();
        std::remove(test_db_path.c_str());
    }
};

TEST_F(TaskModelTest, CreateTaskSuccess) {
    std::optional<Task> task = Task::create("Test Task", "Description for test task", TaskStatus::PENDING, "2023-12-31", test_user_id);
    ASSERT_TRUE(task);
    ASSERT_GT(task->id, 0);
    ASSERT_EQ(task->title, "Test Task");
    ASSERT_EQ(task->status, TaskStatus::PENDING);
    ASSERT_EQ(task->user_id, test_user_id);
}

TEST_F(TaskModelTest, CreateTaskInvalidUserId) {
    // Attempt to create a task with a non-existent user ID, should throw DatabaseException (FK constraint)
    ASSERT_THROW({
        Task::create("Invalid User Task", "Should fail", TaskStatus::PENDING, "2023-12-31", 9999);
    }, DatabaseException);
}

TEST_F(TaskModelTest, FindTaskById) {
    std::optional<Task> created_task = Task::create("Find Me", "This task should be found", TaskStatus::PENDING, "2023-12-31", test_user_id);
    ASSERT_TRUE(created_task);

    std::optional<Task> found_task = Task::find_by_id(created_task->id);
    ASSERT_TRUE(found_task);
    ASSERT_EQ(found_task->id, created_task->id);
    ASSERT_EQ(found_task->title, "Find Me");
}

TEST_F(TaskModelTest, FindTaskByIdNotFound) {
    std::optional<Task> found_task = Task::find_by_id(9999);
    ASSERT_FALSE(found_task);
}

TEST_F(TaskModelTest, FindAllTasks) {
    Task::create("Task 1", "Desc 1", TaskStatus::PENDING, "2023-12-31", test_user_id);
    Task::create("Task 2", "Desc 2", TaskStatus::COMPLETED, "2023-12-31", test_user_id);

    std::vector<Task> tasks = Task::find_all();
    ASSERT_EQ(tasks.size(), 2);
    ASSERT_EQ(tasks[0].title, "Task 1"); // Order might not be guaranteed by default, but for small sets, it's often creation order.
}

TEST_F(TaskModelTest, FindTasksByUserId) {
    long other_user_id = 2;
    db_manager.execute("INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES (2, 'other_user', 'hash', 'user', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');");
    
    Task::create("My Task 1", "My Desc 1", TaskStatus::PENDING, "2023-12-31", test_user_id);
    Task::create("Other User Task", "Other Desc", TaskStatus::PENDING, "2023-12-31", other_user_id);
    Task::create("My Task 2", "My Desc 2", TaskStatus::COMPLETED, "2023-12-31", test_user_id);

    std::vector<Task> my_tasks = Task::find_by_user_id(test_user_id);
    ASSERT_EQ(my_tasks.size(), 2);
    ASSERT_EQ(my_tasks[0].title, "My Task 1");
    ASSERT_EQ(my_tasks[1].title, "My Task 2");

    std::vector<Task> other_tasks = Task::find_by_user_id(other_user_id);
    ASSERT_EQ(other_tasks.size(), 1);
    ASSERT_EQ(other_tasks[0].title, "Other User Task");
}

TEST_F(TaskModelTest, UpdateTask) {
    std::optional<Task> created_task = Task::create("Old Title", "Old Description", TaskStatus::PENDING, "2023-12-31", test_user_id);
    ASSERT_TRUE(created_task);

    created_task->title = "New Title";
    created_task->description = "New Description";
    created_task->status = TaskStatus::COMPLETED;
    created_task->due_date = "2024-01-15";

    ASSERT_TRUE(created_task->update());

    std::optional<Task> updated_task = Task::find_by_id(created_task->id);
    ASSERT_TRUE(updated_task);
    ASSERT_EQ(updated_task->title, "New Title");
    ASSERT_EQ(updated_task->description, "New Description");
    ASSERT_EQ(updated_task->status, TaskStatus::COMPLETED);
    ASSERT_EQ(updated_task->due_date, "2024-01-15");
    ASSERT_NE(updated_task->updated_at, created_task->created_at); // updated_at should change
}

TEST_F(TaskModelTest, UpdateNonExistentTask) {
    Task non_existent_task;
    non_existent_task.id = 9999;
    non_existent_task.title = "Non-existent";
    non_existent_task.description = "Should not update";
    non_existent_task.status = TaskStatus::PENDING;
    non_existent_task.due_date = "2023-12-31";
    non_existent_task.user_id = test_user_id;

    ASSERT_FALSE(non_existent_task.update());
}

TEST_F(TaskModelTest, DeleteTask) {
    std::optional<Task> created_task = Task::create("Delete Me", "This task should be deleted", TaskStatus::PENDING, "2023-12-31", test_user_id);
    ASSERT_TRUE(created_task);

    ASSERT_TRUE(created_task->remove());

    std::optional<Task> found_task = Task::find_by_id(created_task->id);
    ASSERT_FALSE(found_task);
}

TEST_F(TaskModelTest, DeleteNonExistentTask) {
    Task non_existent_task;
    non_existent_task.id = 9999;
    non_existent_task.user_id = test_user_id; // Need to set for remove method to have a valid object

    ASSERT_FALSE(non_existent_task.remove());
}

TEST_F(TaskModelTest, FromDbRowMissingColumn) {
    DbRow incomplete_row;
    incomplete_row.columns["id"] = "1";
    incomplete_row.columns["title"] = "Incomplete"; // Missing other columns

    std::optional<Task> task = Task::from_db_row(incomplete_row);
    ASSERT_FALSE(task);
}

TEST_F(TaskModelTest, ToJsonConversion) {
    Task task(1, "Sample", "Sample Desc", TaskStatus::IN_PROGRESS, "2023-11-20", test_user_id, "2023-11-01T10:00:00Z", "2023-11-01T11:00:00Z");
    Json::Value task_json = task.to_json();

    ASSERT_EQ(task_json["id"].asInt64(), 1);
    ASSERT_EQ(task_json["title"].asString(), "Sample");
    ASSERT_EQ(task_json["description"].asString(), "Sample Desc");
    ASSERT_EQ(task_json["status"].asString(), "in_progress");
    ASSERT_EQ(task_json["due_date"].asString(), "2023-11-20");
    ASSERT_EQ(task_json["user_id"].asInt64(), test_user_id);
}
```