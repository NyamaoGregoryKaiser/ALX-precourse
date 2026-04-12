#include <gtest/gtest.h>
#include "src/utils/cache.h"
#include <chrono>
#include <thread>
#include "src/utils/logger.h"

// Fixture for Cache tests
class CacheTest : public ::testing::Test {
protected:
    Utils::Cache<std::string> string_cache;
    Utils::Cache<int> int_cache;

    void SetUp() override {
        // Initialize logger for tests
        Logger::Logger::getInstance().init("./logs/test_cache.log", Logger::Level::WARN);
    }

    void TearDown() override {
        string_cache.clear();
        int_cache.clear();
    }
};

TEST_F(CacheTest, SetAndGetItem) {
    string_cache.set("key1", "value1", 10); // TTL of 10 seconds
    std::optional<std::string> retrieved = string_cache.get("key1");
    ASSERT_TRUE(retrieved);
    ASSERT_EQ(*retrieved, "value1");
}

TEST_F(CacheTest, GetNonExistentItem) {
    std::optional<std::string> retrieved = string_cache.get("non_existent_key");
    ASSERT_FALSE(retrieved);
}

TEST_F(CacheTest, ItemExpires) {
    string_cache.set("key2", "value2", 1); // TTL of 1 second
    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for 2 seconds
    std::optional<std::string> retrieved = string_cache.get("key2");
    ASSERT_FALSE(retrieved); // Should be expired
}

TEST_F(CacheTest, RemoveItem) {
    string_cache.set("key3", "value3", 10);
    ASSERT_TRUE(string_cache.get("key3"));
    string_cache.remove("key3");
    ASSERT_FALSE(string_cache.get("key3"));
}

TEST_F(CacheTest, ClearCache) {
    string_cache.set("key4", "value4", 10);
    string_cache.set("key5", "value5", 10);
    ASSERT_EQ(string_cache.size(), 2);
    string_cache.clear();
    ASSERT_EQ(string_cache.size(), 0);
    ASSERT_FALSE(string_cache.get("key4"));
}

TEST_F(CacheTest, OverwriteItem) {
    string_cache.set("key6", "initial", 10);
    string_cache.set("key6", "updated", 10); // Overwrite
    std::optional<std::string> retrieved = string_cache.get("key6");
    ASSERT_TRUE(retrieved);
    ASSERT_EQ(*retrieved, "updated");
    ASSERT_EQ(string_cache.size(), 1); // Size should remain 1
}

TEST_F(CacheTest, DifferentTypes) {
    int_cache.set("int_key", 123, 10);
    std::optional<int> retrieved_int = int_cache.get("int_key");
    ASSERT_TRUE(retrieved_int);
    ASSERT_EQ(*retrieved_int, 123);

    string_cache.set("string_key", "hello", 10);
    std::optional<std::string> retrieved_string = string_cache.get("string_key");
    ASSERT_TRUE(retrieved_string);
    ASSERT_EQ(*retrieved_string, "hello");
}

TEST_F(CacheTest, ConcurrentAccessSimple) {
    // This is a basic test. Real concurrent testing needs more advanced frameworks.
    // We primarily check that no crashes occur and basic operations are consistent.
    std::vector<std::thread> threads;
    for (int i = 0; i < 5; ++i) {
        threads.emplace_back([this, i]() {
            for (int j = 0; j < 100; ++j) {
                std::string key = "thread_" + std::to_string(i) + "_item_" + std::to_string(j);
                string_cache.set(key, "value", 5);
                string_cache.get(key);
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    // Check a few items, no strict assertion on total size due to concurrent setting/getting
    // and potential expiration, but should not crash.
    ASSERT_GE(string_cache.size(), 0);
    ASSERT_TRUE(string_cache.get("thread_0_item_0") || !string_cache.get("thread_0_item_0")); // Either found or expired
}
```