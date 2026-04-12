#include <gtest/gtest.h>
#include "src/database/database_manager.h"
#include "src/config/config.h"
#include "src/utils/exceptions.h"
#include "src/utils/logger.h"
#include <fstream>
#include <thread>
#include <vector>

class DatabaseManagerIntegrationTest : public ::testing::Test {
protected:
    DatabaseManager& db_manager = DatabaseManager::getInstance();
    std::string test_db_path = "./data/test_integration_db.db";

    void SetUp() override {
        // Initialize logger for tests
        Logger::Logger::getInstance().init("./logs/test_integration_db.log", Logger::Level::WARN);

        std::remove(test_db_path.c_str()); // Clean up previous test database
        db_manager.init(test_db_path);
        // Create a simple table for testing
        db_manager.execute("CREATE TABLE IF NOT EXISTS test_table ("
                           "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                           "name TEXT NOT NULL,"
                           "value INTEGER"
                           ");");
    }

    void TearDown() override {
        db_manager.close();
        std::remove(test_db_path.c_str()); // Clean up test database file
    }
};

TEST_F(DatabaseManagerIntegrationTest, OpenAndCloseDatabase) {
    // Already opened in SetUp, will be closed in TearDown
    ASSERT_TRUE(true); // If no exceptions, it's successful
}

TEST_F(DatabaseManagerIntegrationTest, ExecuteNonQuery) {
    db_manager.execute("INSERT INTO test_table (name, value) VALUES ('Item 1', 100);");
    std::vector<DbRow> rows = db_manager.query("SELECT * FROM test_table;");
    ASSERT_EQ(rows.size(), 1);
    ASSERT_EQ(rows[0].columns.at("name"), "Item 1");
    ASSERT_EQ(rows[0].columns.at("value"), "100");
}

TEST_F(DatabaseManagerIntegrationTest, ExecuteNonQueryWithPreparedStatements) {
    int affected = db_manager.execute_non_query_prepared(
        "INSERT INTO test_table (name, value) VALUES (?, ?);",
        {{1, "Prepared Item"}, {2, "200"}}
    );
    ASSERT_EQ(affected, 1);

    std::vector<DbRow> rows = db_manager.execute_query_prepared(
        "SELECT name, value FROM test_table WHERE name = ?;",
        {{1, "Prepared Item"}}
    );
    ASSERT_EQ(rows.size(), 1);
    ASSERT_EQ(rows[0].columns.at("name"), "Prepared Item");
    ASSERT_EQ(rows[0].columns.at("value"), "200");
}

TEST_F(DatabaseManagerIntegrationTest, QueryData) {
    db_manager.execute("INSERT INTO test_table (name, value) VALUES ('Item A', 1);");
    db_manager.execute("INSERT INTO test_table (name, value) VALUES ('Item B', 2);");

    std::vector<DbRow> rows = db_manager.query("SELECT name FROM test_table WHERE value > 1;");
    ASSERT_EQ(rows.size(), 1);
    ASSERT_EQ(rows[0].columns.at("name"), "Item B");
}

TEST_F(DatabaseManagerIntegrationTest, QueryPreparedNoResults) {
    std::vector<DbRow> rows = db_manager.execute_query_prepared(
        "SELECT name FROM test_table WHERE name = ?;",
        {{1, "NonExistent"}}
    );
    ASSERT_TRUE(rows.empty());
}

TEST_F(DatabaseManagerIntegrationTest, LastInsertRowId) {
    db_manager.execute("INSERT INTO test_table (name, value) VALUES ('New Item', 300);");
    long long last_id = db_manager.last_insert_rowid();
    ASSERT_GT(last_id, 0);

    std::vector<DbRow> rows = db_manager.query("SELECT id FROM test_table WHERE name = 'New Item';");
    ASSERT_EQ(std::stoll(rows[0].columns.at("id")), last_id);
}

TEST_F(DatabaseManagerIntegrationTest, ConcurrentAccess) {
    // Test with multiple threads inserting data
    int num_threads = 5;
    int inserts_per_thread = 100;
    std::vector<std::thread> threads;

    for (int i = 0; i < num_threads; ++i) {
        threads.emplace_back([this, i, inserts_per_thread]() {
            for (int j = 0; j < inserts_per_thread; ++j) {
                std::string name = "Thread_" + std::to_string(i) + "_Item_" + std::to_string(j);
                int value = i * inserts_per_thread + j;
                try {
                    db_manager.execute_non_query_prepared(
                        "INSERT INTO test_table (name, value) VALUES (?, ?);",
                        {{1, name}, {2, std::to_string(value)}}
                    );
                } catch (const std::exception& e) {
                    LOG_ERROR("Concurrent insert failed: " + std::string(e.what()));
                    // Fail the test if an exception occurs during concurrent access
                    FAIL() << "Concurrent insert failed: " << e.what();
                }
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    // Verify total count
    std::vector<DbRow> rows = db_manager.query("SELECT COUNT(*) as count FROM test_table;");
    ASSERT_EQ(std::stoi(rows[0].columns.at("count")), num_threads * inserts_per_thread);

    // Verify some specific data
    std::vector<DbRow> specific_item = db_manager.execute_query_prepared(
        "SELECT name, value FROM test_table WHERE name = ?;",
        {{1, "Thread_2_Item_50"}}
    );
    ASSERT_EQ(specific_item.size(), 1);
    ASSERT_EQ(specific_item[0].columns.at("value"), std::to_string(2 * inserts_per_thread + 50));
}

TEST_F(DatabaseManagerIntegrationTest, ErrorHandlingInvalidSQL) {
    ASSERT_THROW({
        db_manager.execute("INSERT INTO non_existent_table (name) VALUES ('bad');");
    }, DatabaseException);
}
```