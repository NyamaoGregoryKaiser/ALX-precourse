```cpp
#include "gtest/gtest.h"
#include "../src/utils/database.h"
#include <string>
#include <vector>
#include <filesystem> // For cleanup

namespace fs = std::filesystem;
using namespace mobile_backend::utils;

class DatabaseTest : public ::testing::Test {
protected:
    std::string test_db_path = "test_mobile_backend.db";

    void SetUp() override {
        // Ensure the database file doesn't exist before each test
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
        // Initialize the database for testing
        // Need to re-initialize the singleton for each test
        // This is a bit tricky with a strict singleton. For testing, a factory pattern
        // or dependency injection is better. For this example, we'll try to reset.
        // A more robust approach might involve mocking or using a non-singleton DB instance for tests.
        // For now, we rely on the DB close in destructor and re-open.
        Database::get_instance().initialize(test_db_path);
    }

    void TearDown() override {
        // Close the database and delete the file after each test
        // The Database destructor handles closing.
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
    }
};

TEST_F(DatabaseTest, InitializationCreatesTables) {
    // Tables should be created by initialize() in SetUp
    auto& db = Database::get_instance();
    
    // Check if 'users' table exists
    auto user_table_check = db.fetch_query("SELECT name FROM sqlite_master WHERE type='table' AND name='users';");
    ASSERT_FALSE(user_table_check.empty());
    ASSERT_EQ(user_table_check[0].columns[0].second, "users");

    // Check if 'tasks' table exists
    auto task_table_check = db.fetch_query("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks';");
    ASSERT_FALSE(task_table_check.empty());
    ASSERT_EQ(task_table_check[0].columns[0].second, "tasks");
}

TEST_F(DatabaseTest, ExecuteQueryWorks) {
    auto& db = Database::get_instance();
    std::string sql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?);";
    std::vector<std::string> params = {"testuser", "test@example.com", "testhash"};
    bool success = db.execute_query(sql, params);
    ASSERT_TRUE(success);

    auto results = db.fetch_query("SELECT COUNT(*) FROM users;");
    ASSERT_EQ(results[0].columns[0].second, "1");
}

TEST_F(DatabaseTest, FetchQueryWorks) {
    auto& db = Database::get_instance();
    db.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('fetchuser', 'fetch@example.com', 'fetchhash');");
    
    auto results = db.fetch_query("SELECT username, email FROM users WHERE username = ?;", {"fetchuser"});
    ASSERT_FALSE(results.empty());
    ASSERT_EQ(results[0].columns[0].first, "username");
    ASSERT_EQ(results[0].columns[0].second, "fetchuser");
    ASSERT_EQ(results[0].columns[1].first, "email");
    ASSERT_EQ(results[0].columns[1].second, "fetch@example.com");
}

TEST_F(DatabaseTest, FetchQueryNoResults) {
    auto& db = Database::get_instance();
    auto results = db.fetch_query("SELECT username FROM users WHERE username = 'nonexistent';");
    ASSERT_TRUE(results.empty());
}

TEST_F(DatabaseTest, GetLastInsertRowid) {
    auto& db = Database::get_instance();
    db.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('lastiduser', 'lastid@example.com', 'hash');");
    long long last_id = db.get_last_insert_rowid();
    ASSERT_GT(last_id, 0);

    auto results = db.fetch_query("SELECT id FROM users WHERE username = 'lastiduser';");
    ASSERT_FALSE(results.empty());
    ASSERT_EQ(std::to_string(last_id), results[0].columns[0].second);
}

TEST_F(DatabaseTest, QueryWithNoParams) {
    auto& db = Database::get_instance();
    db.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('noparamuser', 'noparam@example.com', 'hash');");
    auto results = db.fetch_query("SELECT COUNT(*) FROM users;");
    ASSERT_EQ(results[0].columns[0].second, "1");
}

TEST_F(DatabaseTest, UpdateQuery) {
    auto& db = Database::get_instance();
    db.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('updateuser', 'update@example.com', 'oldhash');");
    long long user_id = db.get_last_insert_rowid();

    bool success = db.execute_query("UPDATE users SET password_hash = ? WHERE id = ?;", {"newhash", std::to_string(user_id)});
    ASSERT_TRUE(success);

    auto results = db.fetch_query("SELECT password_hash FROM users WHERE id = ?;", {std::to_string(user_id)});
    ASSERT_FALSE(results.empty());
    ASSERT_EQ(results[0].columns[0].second, "newhash");
}

TEST_F(DatabaseTest, DeleteQuery) {
    auto& db = Database::get_instance();
    db.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('deleteuser', 'delete@example.com', 'hash');");
    long long user_id = db.get_last_insert_rowid();

    bool success = db.execute_query("DELETE FROM users WHERE id = ?;", {std::to_string(user_id)});
    ASSERT_TRUE(success);

    auto results = db.fetch_query("SELECT COUNT(*) FROM users WHERE id = ?;", {std::to_string(user_id)});
    ASSERT_EQ(results[0].columns[0].second, "0");
}

TEST_F(DatabaseTest, ForeignKeysCascadeDelete) {
    auto& db = Database::get_instance();
    
    // Create user
    db.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('owner', 'owner@example.com', 'hash');");
    long long user_id = db.get_last_insert_rowid();

    // Create tasks for the user
    db.execute_query("INSERT INTO tasks (user_id, title) VALUES (?, ?);", {std::to_string(user_id), "Task 1"});
    db.execute_query("INSERT INTO tasks (user_id, title) VALUES (?, ?);", {std::to_string(user_id), "Task 2"});

    // Verify tasks exist
    auto tasks_before_delete = db.fetch_query("SELECT COUNT(*) FROM tasks WHERE user_id = ?;", {std::to_string(user_id)});
    ASSERT_EQ(tasks_before_delete[0].columns[0].second, "2");

    // Delete the user
    bool success = db.execute_query("DELETE FROM users WHERE id = ?;", {std::to_string(user_id)});
    ASSERT_TRUE(success);

    // Verify tasks are also deleted
    auto tasks_after_delete = db.fetch_query("SELECT COUNT(*) FROM tasks WHERE user_id = ?;", {std::to_string(user_id)});
    ASSERT_EQ(tasks_after_delete[0].columns[0].second, "0");
}

TEST_F(DatabaseTest, GetCurrentTimestampFormat) {
    std::string timestamp = Database::get_current_timestamp();
    // Basic format check: YYYY-MM-DD HH:MM:SS
    ASSERT_EQ(timestamp.length(), 19);
    ASSERT_EQ(timestamp[4], '-');
    ASSERT_EQ(timestamp[7], '-');
    ASSERT_EQ(timestamp[10], ' ');
    ASSERT_EQ(timestamp[13], ':');
    ASSERT_EQ(timestamp[16], ':');
}
```