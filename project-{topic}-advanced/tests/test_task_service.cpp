```cpp
#include "gtest/gtest.h"
#include "../src/services/task_service.h"
#include "../src/services/auth_service.h" // For hashing passwords
#include "../src/utils/database.h"
#include "../src/utils/cache.h"
#include <string>
#include <vector>
#include <optional>
#include <filesystem>

namespace fs = std::filesystem;
using namespace mobile_backend::utils;
using namespace mobile_backend::services;
using namespace mobile_backend::models;

class TaskServiceTest : public ::testing::Test {
protected:
    std::string test_db_path = "test_task_service.db";
    Database& db_instance = Database::get_instance();
    Cache<Task> task_cache_instance = Cache<Task>(std::chrono::seconds(10));
    TaskService* task_service;

    int user1_id;
    int user2_id;

    void SetUp() override {
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
        db_instance.initialize(test_db_path);
        task_cache_instance.clear();
        task_service = new TaskService(db_instance, task_cache_instance);

        // Seed users
        db_instance.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('taskuser1', 'taskuser1@example.com', ?);", {AuthService::hash_password("password123")});
        user1_id = static_cast<int>(db_instance.get_last_insert_rowid());
        db_instance.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('taskuser2', 'taskuser2@example.com', ?);", {AuthService::hash_password("password123")});
        user2_id = static_cast<int>(db_instance.get_last_insert_rowid());

        // Seed some tasks for user1
        db_instance.execute_query("INSERT INTO tasks (user_id, title, description, completed) VALUES (?, 'Task 1 for User 1', 'Desc 1', 0);", {std::to_string(user1_id)});
        db_instance.execute_query("INSERT INTO tasks (user_id, title, description, completed) VALUES (?, 'Task 2 for User 1', 'Desc 2', 1);", {std::to_string(user1_id)});
    }

    void TearDown() override {
        delete task_service;
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
    }

    // Helper to get task ID by title for a specific user
    int get_task_id_by_title(int user_id, const std::string& title) {
        auto results = db_instance.fetch_query("SELECT id FROM tasks WHERE user_id = ? AND title = ?;", {std::to_string(user_id), title});
        if (!results.empty()) {
            return std::stoi(results[0].columns[0].second);
        }
        return -1;
    }
};

TEST_F(TaskServiceTest, CreateTaskSuccess) {
    Task new_task = task_service->create_task(user1_id, "New Task", "Description of new task");
    ASSERT_GT(new_task.id, 0);
    ASSERT_EQ(new_task.user_id, user1_id);
    ASSERT_EQ(new_task.title, "New Task");
    ASSERT_EQ(new_task.description, "Description of new task");
    ASSERT_FALSE(new_task.completed);

    // Verify in DB
    auto results = db_instance.fetch_query("SELECT COUNT(*) FROM tasks WHERE id = ?;", {std::to_string(new_task.id)});
    ASSERT_EQ(results[0].columns[0].second, "1");
}

TEST_F(TaskServiceTest, CreateTaskInvalidUserId) {
    ASSERT_THROW(task_service->create_task(0, "Invalid Task", "Desc"), TaskServiceException);
}

TEST_F(TaskServiceTest, CreateTaskEmptyTitle) {
    ASSERT_THROW(task_service->create_task(user1_id, "", "Desc"), TaskServiceException);
}

TEST_F(TaskServiceTest, GetTaskByIdSuccess) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    ASSERT_GT(task_id, 0);

    std::optional<Task> task = task_service->get_task_by_id(task_id, user1_id);
    ASSERT_TRUE(task.has_value());
    ASSERT_EQ(task->id, task_id);
    ASSERT_EQ(task->user_id, user1_id);
    ASSERT_EQ(task->title, "Task 1 for User 1");
    ASSERT_FALSE(task->completed);

    // Verify cache hit
    std::optional<Task> cached_task = task_cache_instance.get("task_id_" + std::to_string(task_id) + "_user_" + std::to_string(user1_id));
    ASSERT_TRUE(cached_task.has_value());
    ASSERT_EQ(cached_task->title, "Task 1 for User 1");
}

TEST_F(TaskServiceTest, GetTaskByIdNotFound) {
    std::optional<Task> task = task_service->get_task_by_id(9999, user1_id);
    ASSERT_FALSE(task.has_value());
}

TEST_F(TaskServiceTest, GetTaskByIdBelongsToAnotherUser) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    ASSERT_GT(task_id, 0);

    // Try to get user1's task with user2's ID
    std::optional<Task> task = task_service->get_task_by_id(task_id, user2_id);
    ASSERT_FALSE(task.has_value());
}

TEST_F(TaskServiceTest, GetAllTasksForUser) {
    // Add another task for user1
    task_service->create_task(user1_id, "Another Task for User 1", "");

    std::vector<Task> tasks = task_service->get_all_tasks_for_user(user1_id);
    ASSERT_EQ(tasks.size(), 3); // 2 seeded + 1 new

    // Verify order (most recent first)
    ASSERT_EQ(tasks[0].title, "Another Task for User 1");
    ASSERT_EQ(tasks[1].title, "Task 2 for User 1");
    ASSERT_EQ(tasks[2].title, "Task 1 for User 1");

    // Tasks for user2 should be empty
    std::vector<Task> user2_tasks = task_service->get_all_tasks_for_user(user2_id);
    ASSERT_TRUE(user2_tasks.empty());
}

TEST_F(TaskServiceTest, GetAllTasksForUserWithCompletedFilter) {
    // We have 1 completed task and 1 not completed seeded for user1
    std::vector<Task> completed_tasks = task_service->get_all_tasks_for_user(user1_id, true);
    ASSERT_EQ(completed_tasks.size(), 1);
    ASSERT_EQ(completed_tasks[0].title, "Task 2 for User 1");
    ASSERT_TRUE(completed_tasks[0].completed);

    std::vector<Task> incomplete_tasks = task_service->get_all_tasks_for_user(user1_id, false);
    // There are two non-completed: 'Task 1 for User 1' and the 'New Task' created in previous test.
    // However, for clean tests, we should only have seeded tasks.
    // Let's explicitly create some for this test.
    db_instance.execute_query("DELETE FROM tasks WHERE user_id = ?;", {std::to_string(user1_id)}); // Clear tasks for user1
    task_service->create_task(user1_id, "Task A", "", false);
    task_service->create_task(user1_id, "Task B", "", true);
    task_service->create_task(user1_id, "Task C", "", false);

    std::vector<Task> all_tasks = task_service->get_all_tasks_for_user(user1_id);
    ASSERT_EQ(all_tasks.size(), 3);

    completed_tasks = task_service->get_all_tasks_for_user(user1_id, true);
    ASSERT_EQ(completed_tasks.size(), 1);
    ASSERT_EQ(completed_tasks[0].title, "Task B");

    incomplete_tasks = task_service->get_all_tasks_for_user(user1_id, false);
    ASSERT_EQ(incomplete_tasks.size(), 2);
    ASSERT_EQ(incomplete_tasks[0].title, "Task C"); // Order is DESC created_at
    ASSERT_EQ(incomplete_tasks[1].title, "Task A");
}

TEST_F(TaskServiceTest, UpdateTaskSuccessTitle) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    Task updated_task = task_service->update_task(task_id, user1_id, std::make_optional("Updated Title"), std::nullopt, std::nullopt);
    ASSERT_EQ(updated_task.title, "Updated Title");
    ASSERT_EQ(updated_task.description, "Desc 1"); // Unchanged
    
    // Verify in DB
    auto results = db_instance.fetch_query("SELECT title FROM tasks WHERE id = ?;", {std::to_string(task_id)});
    ASSERT_EQ(results[0].columns[0].second, "Updated Title");

    // Verify cache invalidated
    std::optional<Task> cached_task = task_cache_instance.get("task_id_" + std::to_string(task_id) + "_user_" + std::to_string(user1_id));
    ASSERT_FALSE(cached_task.has_value());
}

TEST_F(TaskServiceTest, UpdateTaskSuccessCompleted) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    Task updated_task = task_service->update_task(task_id, user1_id, std::nullopt, std::nullopt, std::make_optional(true));
    ASSERT_TRUE(updated_task.completed);

    // Verify in DB
    auto results = db_instance.fetch_query("SELECT completed FROM tasks WHERE id = ?;", {std::to_string(task_id)});
    ASSERT_EQ(results[0].columns[0].second, "1"); // SQLite stores true as 1
}

TEST_F(TaskServiceTest, UpdateTaskNotFound) {
    ASSERT_THROW(task_service->update_task(9999, user1_id, std::make_optional("Title"), std::nullopt, std::nullopt), TaskServiceException);
}

TEST_F(TaskServiceTest, UpdateTaskBelongsToAnotherUser) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    ASSERT_THROW(task_service->update_task(task_id, user2_id, std::make_optional("Title"), std::nullopt, std::nullopt), TaskServiceException);
}

TEST_F(TaskServiceTest, UpdateTaskEmptyTitle) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    ASSERT_THROW(task_service->update_task(task_id, user1_id, std::make_optional(""), std::nullopt, std::nullopt), TaskServiceException);
}

TEST_F(TaskServiceTest, DeleteTaskSuccess) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    task_service->delete_task(task_id, user1_id);

    // Verify deleted from DB
    auto results = db_instance.fetch_query("SELECT COUNT(*) FROM tasks WHERE id = ?;", {std::to_string(task_id)});
    ASSERT_EQ(results[0].columns[0].second, "0");

    // Verify cache invalidated
    std::optional<Task> cached_task = task_cache_instance.get("task_id_" + std::to_string(task_id) + "_user_" + std::to_string(user1_id));
    ASSERT_FALSE(cached_task.has_value());
}

TEST_F(TaskServiceTest, DeleteTaskNotFound) {
    ASSERT_THROW(task_service->delete_task(9999, user1_id), TaskServiceException);
}

TEST_F(TaskServiceTest, DeleteTaskBelongsToAnotherUser) {
    int task_id = get_task_id_by_title(user1_id, "Task 1 for User 1");
    ASSERT_THROW(task_service->delete_task(task_id, user2_id), TaskServiceException);
}
```