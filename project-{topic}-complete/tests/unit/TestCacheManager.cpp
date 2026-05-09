```cpp
#include "gtest/gtest.h"
#include "core/cache/CacheManager.h"
#include "util/Logger.h"
#include <thread>
#include <chrono>

// Initialize logger for tests
void init_test_logger() {
    static bool initialized = false;
    if (!initialized) {
        VisuFlow::Util::Logger::init("error", "test_visuflow.log"); // Log errors only during tests
        initialized = true;
    }
}

class CacheManagerTest : public ::testing::Test {
protected:
    VisuFlow::Core::Cache::CacheManager cacheManager; // Uses default TTL (300s)

    void SetUp() override {
        init_test_logger();
        cacheManager.clear(); // Ensure cache is empty before each test
    }
};

TEST_F(CacheManagerTest, PutAndGet) {
    cacheManager.put("key1", "value1");
    auto value = cacheManager.get("key1");
    ASSERT_TRUE(value.has_value());
    ASSERT_EQ(value.value(), "value1");
    ASSERT_EQ(cacheManager.size(), 1);
}

TEST_F(CacheManagerTest, GetNonExistentKey) {
    auto value = cacheManager.get("nonexistent_key");
    ASSERT_FALSE(value.has_value());
    ASSERT_EQ(cacheManager.size(), 0); // No new entry created
}

TEST_F(CacheManagerTest, RemoveKey) {
    cacheManager.put("key1", "value1");
    ASSERT_EQ(cacheManager.size(), 1);

    cacheManager.remove("key1");
    ASSERT_FALSE(cacheManager.get("key1").has_value());
    ASSERT_EQ(cacheManager.size(), 0);
}

TEST_F(CacheManagerTest, RemoveNonExistentKey) {
    cacheManager.put("key1", "value1");
    cacheManager.remove("nonexistent_key"); // Should do nothing
    ASSERT_EQ(cacheManager.size(), 1);
    ASSERT_TRUE(cacheManager.get("key1").has_value());
}

TEST_F(CacheManagerTest, ClearCache) {
    cacheManager.put("key1", "value1");
    cacheManager.put("key2", "value2");
    ASSERT_EQ(cacheManager.size(), 2);

    cacheManager.clear();
    ASSERT_EQ(cacheManager.size(), 0);
    ASSERT_FALSE(cacheManager.get("key1").has_value());
    ASSERT_FALSE(cacheManager.get("key2").has_value());
}

TEST_F(CacheManagerTest, ExpirationWithCustomTTL) {
    // Override default TTL for this entry to 1 second
    cacheManager.put("expiring_key", "expiring_value", 1);
    ASSERT_EQ(cacheManager.size(), 1);

    auto valueBeforeExpiration = cacheManager.get("expiring_key");
    ASSERT_TRUE(valueBeforeExpiration.has_value());

    // Wait for the entry to expire
    std::this_thread::sleep_for(std::chrono::seconds(2));

    auto valueAfterExpiration = cacheManager.get("expiring_key");
    ASSERT_FALSE(valueAfterExpiration.has_value());
    ASSERT_EQ(cacheManager.size(), 0); // Should be removed upon access
}

TEST_F(CacheManagerTest, ExpirationWithDefaultTTL) {
    // Setup a new cache manager instance with a very short default TTL for testing
    VisuFlow::Core::Cache::CacheManager shortTtlCache(1); // 1 second default TTL
    shortTtlCache.put("default_ttl_key", "default_ttl_value");
    ASSERT_EQ(shortTtlCache.size(), 1);

    auto valueBeforeExpiration = shortTtlCache.get("default_ttl_key");
    ASSERT_TRUE(valueBeforeExpiration.has_value());

    std::this_thread::sleep_for(std::chrono::seconds(2));

    auto valueAfterExpiration = shortTtlCache.get("default_ttl_key");
    ASSERT_FALSE(valueAfterExpiration.has_value());
    ASSERT_EQ(shortTtlCache.size(), 0);
}

TEST_F(CacheManagerTest, ThreadSafety) {
    const int num_threads = 10;
    const int num_puts_per_thread = 100;
    std::vector<std::thread> threads;

    for (int i = 0; i < num_threads; ++i) {
        threads.emplace_back([this, i]() {
            for (int j = 0; j < num_puts_per_thread; ++j) {
                std::string key = "thread_" + std::to_string(i) + "_key_" + std::to_string(j);
                std::string value = "thread_" + std::to_string(i) + "_value_" + std::to_string(j);
                cacheManager.put(key, value);
                // Also test some gets to simulate real world usage
                cacheManager.get(key);
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    ASSERT_EQ(cacheManager.size(), num_threads * num_puts_per_thread); // All should be in cache
    for (int i = 0; i < num_threads; ++i) {
        for (int j = 0; j < num_puts_per_thread; ++j) {
            std::string key = "thread_" + std::to_string(i) + "_key_" + std::to_string(j);
            std::string expected_value = "thread_" + std::to_string(i) + "_value_" + std::to_string(j);
            auto value = cacheManager.get(key);
            ASSERT_TRUE(value.has_value());
            ASSERT_EQ(value.value(), expected_value);
        }
    }
}
```