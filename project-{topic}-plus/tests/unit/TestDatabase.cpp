```cpp
#include <gtest/gtest.h>
#include "../../src/database/Database.h"
#include "../../src/utils/Logger.h"
#include "../../src/exceptions/CustomExceptions.h"
#include "../../src/config/AppConfig.h"
#include <fstream>
#include <filesystem>

namespace fs = std::filesystem;

class DatabaseTest : public ::testing::Test {
protected:
    TaskManager::Database::Database& db = TaskManager::Database::Database::getInstance();
    TaskManager::Config::AppConfig& config = TaskManager::Config::AppConfig::getInstance();
    std::string test_db_path = "test_db.db";
    std::string test_schema_path = "test_schema.sql";

    void SetUp() override {
        TaskManager::Utils::Logger::init("off"); // Turn off logging for tests
        config.load(".env.example"); // Load example config
        config.get("DATABASE_PATH") = test_db_path; // Override DB path for test

        // Clean up previous test DB
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }

        // Create a minimal schema for testing
        std::ofstream schema_file(test_schema_path);
        schema_file << "CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, value INTEGER);";
        schema_file << "CREATE TABLE IF NOT EXISTS another_table (id INTEGER PRIMARY KEY AUTOINCREMENT, desc TEXT);";
        schema_file.close();

        db.connect(test_db_path);
        
        std::ifstream schema_reader(test_schema_path);
        std::stringstream buffer;
        buffer << schema_reader.rdbuf();
        db.execute(buffer.str());
    }

    void TearDown() override {
        db.disconnect();
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
        if (fs::exists(test_schema_path)) {
            fs::remove(test_schema_path);
        }
    }
};

TEST_F(DatabaseTest, ConnectionWorks) {
    ASSERT_NO_THROW(db.execute("SELECT 1;"));
}

TEST_F(DatabaseTest, InsertAndQuery) {
    db.execute("INSERT INTO test_table (name, value) VALUES ('test1', 10);");
    db.execute("INSERT INTO test_table (name, value) VALUES ('test2', 20);");

    TaskManager::Database::ResultSet results = db.query("SELECT * FROM test_table ORDER BY id;");
    ASSERT_EQ(results.size(), 2);
    ASSERT_EQ(results[0].at("name"), "test1");
    ASSERT_EQ(results[0].at("value"), "10");
    ASSERT_EQ(results[1].at("name"), "test2");
    ASSERT_EQ(results[1].at("value"), "20");
}

TEST_F(DatabaseTest, PreparedInsertAndQuery) {
    db.preparedExecute("INSERT INTO test_table (name, value) VALUES (?, ?);", {"prepared_test1", "100"});
    db.preparedExecute("INSERT INTO test_table (name, value) VALUES (?, ?);", {"prepared_test2", "200"});

    TaskManager::Database::ResultSet results = db.preparedQuery("SELECT * FROM test_table WHERE name LIKE ? ORDER BY id;", {"%prepared%"});
    ASSERT_EQ(results.size(), 2);
    ASSERT_EQ(results[0].at("name"), "prepared_test1");
    ASSERT_EQ(results[0].at("value"), "100");
    ASSERT_EQ(results[1].at("name"), "prepared_test2");
    ASSERT_EQ(results[1].at("value"), "200");
}

TEST_F(DatabaseTest, UpdateData) {
    db.execute("INSERT INTO test_table (name, value) VALUES ('old_name', 50);");
    long long last_id = db.getLastInsertRowId();
    db.preparedExecute("UPDATE test_table SET name = ?, value = ? WHERE id = ?;", {"new_name", "55", std::to_string(last_id)});

    TaskManager::Database::ResultSet results = db.preparedQuery("SELECT * FROM test_table WHERE id = ?;", {std::to_string(last_id)});
    ASSERT_EQ(results.size(), 1);
    ASSERT_EQ(results[0].at("name"), "new_name");
    ASSERT_EQ(results[0].at("value"), "55");
}

TEST_F(DatabaseTest, DeleteData) {
    db.execute("INSERT INTO test_table (name, value) VALUES ('to_delete', 99);");
    long long last_id = db.getLastInsertRowId();
    db.preparedExecute("DELETE FROM test_table WHERE id = ?;", {std::to_string(last_id)});

    TaskManager::Database::ResultSet results = db.preparedQuery("SELECT * FROM test_table WHERE id = ?;", {std::to_string(last_id)});
    ASSERT_TRUE(results.empty());
}

TEST_F(DatabaseTest, GetLastInsertRowId) {
    db.execute("INSERT INTO test_table (name, value) VALUES ('row_id_test', 1);");
    long long id1 = db.getLastInsertRowId();
    ASSERT_GT(id1, 0);

    db.execute("INSERT INTO test_table (name, value) VALUES ('row_id_test2', 2);");
    long long id2 = db.getLastInsertRowId();
    ASSERT_GT(id2, id1);
}

TEST_F(DatabaseTest, TransactionOperations) {
    db.beginTransaction();
    db.preparedExecute("INSERT INTO test_table (name, value) VALUES (?, ?);", {"trans_item1", "1"});
    db.preparedExecute("INSERT INTO test_table (name, value) VALUES (?, ?);", {"trans_item2", "2"});
    db.commitTransaction();

    TaskManager::Database::ResultSet results = db.query("SELECT * FROM test_table WHERE name LIKE 'trans_item%';");
    ASSERT_EQ(results.size(), 2);

    db.beginTransaction();
    db.preparedExecute("INSERT INTO test_table (name, value) VALUES (?, ?);", {"rollback_item", "3"});
    db.rollbackTransaction();

    results = db.query("SELECT * FROM test_table WHERE name = 'rollback_item';");
    ASSERT_TRUE(results.empty());
}

TEST_F(DatabaseTest, ErrorHandling) {
    // Attempt to execute invalid SQL
    ASSERT_THROW(db.execute("INSERT INTO non_existent_table (id) VALUES (1);"), TaskManager::Exceptions::DatabaseException);
    
    // Attempt to query with invalid SQL
    ASSERT_THROW(db.query("SELECT * FROM non_existent_table;"), TaskManager::Exceptions::DatabaseException);

    // Attempt prepared statement with invalid number of parameters
    ASSERT_THROW(db.preparedExecute("INSERT INTO test_table (name) VALUES (?, ?);", {"too_many", "params"}), TaskManager::Exceptions::DatabaseException);
}

TEST_F(DatabaseTest, DisconnectAndReconnect) {
    db.disconnect();
    ASSERT_NO_THROW(db.connect(test_db_path)); // Reconnect
    ASSERT_NO_THROW(db.execute("SELECT 1;")); // Verify connection
}
```