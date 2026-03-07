```cpp
#include <gtest/gtest.h>
#include "../../src/services/TaskService.h"
#include "../../src/services/AuthService.h" // For user setup
#include "../../src/models/Task.h"
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>
#include <fstream>
#include <vector>

// Global setup for tests
class TaskServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Create a temporary in-memory database or file-based for tests
        std::string testDbPath = "./test_task_db.db";
        std::remove(testDbPath.c_str());

        Json::Value dbConfig;
        dbConfig["db_type"] = "sqlite3";
        dbConfig["db_host"] = testDbPath;
        dbConfig["connections_num"] = 1;
        dbConfig["is_fast"] = true;
        dbConfig["name"] = "test_task_default";

        drogon::app().addDbClient(dbConfig, "test_task_default");
        dbClient_ = drogon::app().getDbClient("test_task_default");

        std::ifstream schemaFile("../../db/schema.sql");
        std::string schemaSql((std::istreambuf_iterator<char>(schemaFile)),
                               std::istreambuf_iterator<char>());
        
        drogon::AsyncTask<void> setupTask = [this, schemaSql]() -> drogon::Task<void> {
            try {
                co_await dbClient_->execSqlCoro(schemaSql);
                // Also need to set JWT secret if AuthFilter is used in controllers
                drogon::app().getMutableJsonConfig()["filters"]["AuthFilter"]["jwt_secret"] = "test_jwt_secret";
                
                authService_ = std::make_unique<AuthService>(dbClient_);
                taskService_ = std::make_unique<TaskService>(dbClient_);

                // Register a test user for tasks
                auto userResult = co_await authService_->registerUser("taskuser", "task@test.com", "taskpassword");
                testUserId_ = userResult.first.id;
            } catch (const drogon::orm::DrogonDbException& e) {
                FAIL() << "Failed to apply schema or register user: " << e.what();
            }
        }();
        drogon::app().getLoop()->queueInLoop([&setupTask]() {
            setupTask.run();
        });
        drogon::app().getLoop()->runInLoop([](){}); // Process the queued task
        drogon::app().getLoop()->queueInLoop([](){}); // Run another cycle to finish async setup
    }

    void TearDown() override {
        drogon::app().getLoop()->queueInLoop([this]() {
            drogon::app().releaseDbClient("test_task_default");
        });
        drogon::app().getLoop()->runInLoop([](){});
        std::remove("./test_task_db.db");
    }

    drogon::orm::DbClientPtr dbClient_;
    std::unique_ptr<AuthService> authService_;
    std::unique_ptr<TaskService> taskService_;
    int testUserId_ = 0;
};

TEST_F(TaskServiceTest, CreateTaskSuccess) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        Json::Value taskJson;
        taskJson["title"] = "New Task";
        taskJson["description"] = "A description for the new task.";
        taskJson["due_date"] = "2023-12-31";

        Task createdTask = co_await taskService_->createTask(testUserId_, taskJson);
        EXPECT_GT(createdTask.id, 0);
        EXPECT_EQ(createdTask.title, "New Task");
        EXPECT_EQ(createdTask.user_id, testUserId_);
        EXPECT_EQ(createdTask.status, Task::Status::TODO);
        EXPECT_EQ(createdTask.due_date, "2023-12-31");

        // Verify it's in the DB
        auto fetchedTask = co_await taskService_->getTaskByIdAndUserId(createdTask.id, testUserId_);
        EXPECT_TRUE(fetchedTask.has_value());
        EXPECT_EQ(fetchedTask.value().title, "New Task");
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(TaskServiceTest, GetTasksByUserId) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        Json::Value task1Json, task2Json;
        task1Json["title"] = "Task One";
        task2Json["title"] = "Task Two";
        task2Json["status"] = "IN_PROGRESS";

        co_await taskService_->createTask(testUserId_, task1Json);
        co_await taskService_->createTask(testUserId_, task2Json);

        auto tasks = co_await taskService_->getTasksByUserId(testUserId_);
        EXPECT_EQ(tasks.size(), 2);

        auto todoTasks = co_await taskService_->getTasksByUserId(testUserId_, Task::Status::TODO);
        EXPECT_EQ(todoTasks.size(), 1);
        EXPECT_EQ(todoTasks[0].title, "Task One");

        auto inProgressTasks = co_await taskService_->getTasksByUserId(testUserId_, Task::Status::IN_PROGRESS);
        EXPECT_EQ(inProgressTasks.size(), 1);
        EXPECT_EQ(inProgressTasks[0].title, "Task Two");
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(TaskServiceTest, UpdateTaskSuccess) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        Json::Value initialTaskJson;
        initialTaskJson["title"] = "Task to Update";
        Task createdTask = co_await taskService_->createTask(testUserId_, initialTaskJson);

        Json::Value updateTaskJson;
        updateTaskJson["title"] = "Updated Task Title";
        updateTaskJson["status"] = "DONE";
        updateTaskJson["description"] = "New description.";

        Task updatedTask = co_await taskService_->updateTask(createdTask.id, testUserId_, updateTaskJson);
        EXPECT_EQ(updatedTask.title, "Updated Task Title");
        EXPECT_EQ(updatedTask.status, Task::Status::DONE);
        EXPECT_EQ(updatedTask.description, "New description.");
        EXPECT_GT(updatedTask.updated_at, createdTask.created_at); // updated_at should be newer

        auto fetchedTask = co_await taskService_->getTaskByIdAndUserId(createdTask.id, testUserId_);
        EXPECT_TRUE(fetchedTask.has_value());
        EXPECT_EQ(fetchedTask.value().title, "Updated Task Title");
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(TaskServiceTest, UpdateTaskNotFoundOrNotOwned) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        Json::Value updateTaskJson;
        updateTaskJson["title"] = "Attempt Update";

        // Try to update a non-existent task
        try {
            co_await taskService_->updateTask(999, testUserId_, updateTaskJson);
            FAIL() << "Expected HttpException for non-existent task, but it succeeded.";
        } catch (const drogon::HttpException& e) {
            EXPECT_EQ(e.statusCode(), drogon::k404NotFound);
        }

        // Register another user
        auto otherUserResult = co_await authService_->registerUser("otheruser", "other@test.com", "otherpass");
        int otherUserId = otherUserResult.first.id;

        // Create a task for original user
        Json::Value initialTaskJson;
        initialTaskJson["title"] = "Original User Task";
        Task originalUserTask = co_await taskService_->createTask(testUserId_, initialTaskJson);

        // Try to update original user's task with other user's ID
        try {
            co_await taskService_->updateTask(originalUserTask.id, otherUserId, updateTaskJson);
            FAIL() << "Expected HttpException for not owned task, but it succeeded.";
        } catch (const drogon::HttpException& e) {
            EXPECT_EQ(e.statusCode(), drogon::k404NotFound);
        }
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(TaskServiceTest, DeleteTaskSuccess) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        Json::Value initialTaskJson;
        initialTaskJson["title"] = "Task to Delete";
        Task createdTask = co_await taskService_->createTask(testUserId_, initialTaskJson);

        co_await taskService_->deleteTask(createdTask.id, testUserId_);

        auto fetchedTask = co_await taskService_->getTaskByIdAndUserId(createdTask.id, testUserId_);
        EXPECT_FALSE(fetchedTask.has_value()); // Should be deleted
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(TaskServiceTest, DeleteTaskNotFoundOrNotOwned) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        // Try to delete a non-existent task
        try {
            co_await taskService_->deleteTask(999, testUserId_);
            FAIL() << "Expected HttpException for non-existent task, but it succeeded.";
        } catch (const drogon::HttpException& e) {
            EXPECT_EQ(e.statusCode(), drogon::k404NotFound);
        }

        // Register another user
        auto otherUserResult = co_await authService_->registerUser("anotherdeleteuser", "anotherdelete@test.com", "otherpass");
        int otherUserId = otherUserResult.first.id;

        // Create a task for original user
        Json::Value initialTaskJson;
        initialTaskJson["title"] = "Task to delete but owned by someone else";
        Task originalUserTask = co_await taskService_->createTask(testUserId_, initialTaskJson);

        // Try to delete original user's task with other user's ID
        try {
            co_await taskService_->deleteTask(originalUserTask.id, otherUserId);
            FAIL() << "Expected HttpException for not owned task, but it succeeded.";
        } catch (const drogon::HttpException& e) {
            EXPECT_EQ(e.statusCode(), drogon::k404NotFound);
        }
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}
```