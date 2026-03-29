```cpp
#include "gtest/gtest.h"
#include "../../src/utils/CachingManager.hpp"
#include "../../src/utils/Logger.hpp"
#include <chrono>
#include <thread>

class CachingManagerTest : public ::testing::Test {
protected:
    CachingManager cache_manager_;

    void SetUp() override {
        Logger::init(LogLevel::DEBUG, "test_cache_manager.log");
        cache_manager_.clear(); // Ensure clean state before each test
    }

    void TearDown() override {
        cache_manager_.clear();
        Logger::close();
    }
};

TEST_F(CachingManagerTest, SetAndGetItem) {
    cache_manager_.set("key1", "value1", 60); // TTL of 60 seconds
    std::optional<std::string> retrieved_value = cache_manager_.get("key1");
    ASSERT_TRUE(retrieved_value.has_value());
    ASSERT_EQ(retrieved_value.value(), "value1");
}

TEST_F(CachingManagerTest, GetNonExistentItem) {
    std::optional<std::string> retrieved_value = cache_manager_.get("non_existent_key");
    ASSERT_FALSE(retrieved_value.has_value());
}

TEST_F(CachingManagerTest, GetExpiredItem) {
    cache_manager_.set("key_expired", "value_expired", 1); // TTL of 1 second

    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for 2 seconds

    std::optional<std::string> retrieved_value = cache_manager_.get("key_expired");
    ASSERT_FALSE(retrieved_value.has_value()); // Should be expired and removed
}

TEST_F(CachingManagerTest, RemoveItem) {
    cache_manager_.set("key_to_remove", "value", 60);
    ASSERT_TRUE(cache_manager_.get("key_to_remove").has_value());

    cache_manager_.remove("key_to_remove");
    ASSERT_FALSE(cache_manager_.get("key_to_remove").has_value());
}

TEST_F(CachingManagerTest, ClearCache) {
    cache_manager_.set("key1", "value1", 60);
    cache_manager_.set("key2", "value2", 60);
    ASSERT_EQ(cache_manager_.size(), 2);

    cache_manager_.clear();
    ASSERT_EQ(cache_manager_.size(), 0);
    ASSERT_FALSE(cache_manager_.get("key1").has_value());
}

TEST_F(CachingManagerTest, SizeCountsOnlyValidItems) {
    cache_manager_.set("valid_key", "value", 60);
    cache_manager_.set("expired_key", "value", 1);
    
    std::this_thread::sleep_for(std::chrono::seconds(2));

    ASSERT_EQ(cache_manager_.size(), 1); // Only "valid_key" should remain
}

TEST_F(CachingManagerTest, OverwriteItem) {
    cache_manager_.set("key_overwrite", "original", 60);
    cache_manager_.set("key_overwrite", "new_value", 60);

    std::optional<std::string> retrieved_value = cache_manager_.get("key_overwrite");
    ASSERT_TRUE(retrieved_value.has_value());
    ASSERT_EQ(retrieved_value.value(), "new_value");
    ASSERT_EQ(cache_manager_.size(), 1);
}
```