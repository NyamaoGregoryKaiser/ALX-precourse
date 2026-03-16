```cpp
#include "gtest/gtest.h"
#include "../src/utils/cache.h"
#include <string>
#include <chrono>
#include <thread> // For std::this_thread::sleep_for

using namespace mobile_backend::utils;

TEST(CacheTest, PutAndGetItem) {
    Cache<std::string> cache(std::chrono::seconds(5));
    cache.put("key1", "value1");
    std::optional<std::string> value = cache.get("key1");
    ASSERT_TRUE(value.has_value());
    ASSERT_EQ(value.value(), "value1");
    ASSERT_EQ(cache.size(), 1);
}

TEST(CacheTest, GetNonExistentItem) {
    Cache<std::string> cache(std::chrono::seconds(5));
    std::optional<std::string> value = cache.get("nonexistent");
    ASSERT_FALSE(value.has_value());
    ASSERT_EQ(cache.size(), 0);
}

TEST(CacheTest, ItemExpiresAfterTTL) {
    Cache<std::string> cache(std::chrono::seconds(1)); // 1 second TTL
    cache.put("key2", "value2");
    
    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for 2 seconds

    std::optional<std::string> value = cache.get("key2");
    ASSERT_FALSE(value.has_value()); // Should be expired
    ASSERT_EQ(cache.size(), 0); // Expired item should be removed on access
}

TEST(CacheTest, UpdateItemResetsTTL) {
    Cache<std::string> cache(std::chrono::seconds(2));
    cache.put("key3", "value3_old");
    std::this_thread::sleep_for(std::chrono::milliseconds(500)); // Wait a bit
    
    cache.put("key3", "value3_new"); // Update, should reset TTL
    
    std::this_thread::sleep_for(std::chrono::seconds(1)); // Wait
    std::optional<std::string> value = cache.get("key3");
    ASSERT_TRUE(value.has_value()); // Should still be fresh
    ASSERT_EQ(value.value(), "value3_new");

    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait past original + new TTL
    value = cache.get("key3");
    ASSERT_FALSE(value.has_value()); // Now it should be expired
}

TEST(CacheTest, RemoveItem) {
    Cache<std::string> cache(std::chrono::seconds(5));
    cache.put("key4", "value4");
    ASSERT_EQ(cache.size(), 1);
    
    cache.remove("key4");
    std::optional<std::string> value = cache.get("key4");
    ASSERT_FALSE(value.has_value());
    ASSERT_EQ(cache.size(), 0);

    // Removing non-existent key should not cause issues
    cache.remove("nonexistent_key");
    ASSERT_EQ(cache.size(), 0);
}

TEST(CacheTest, ClearCache) {
    Cache<std::string> cache(std::chrono::seconds(5));
    cache.put("key5a", "value5a");
    cache.put("key5b", "value5b");
    ASSERT_EQ(cache.size(), 2);

    cache.clear();
    ASSERT_EQ(cache.size(), 0);
    ASSERT_FALSE(cache.get("key5a").has_value());
    ASSERT_FALSE(cache.get("key5b").has_value());
}

TEST(CacheTest, MultipleItemTypes) {
    Cache<int> int_cache(std::chrono::seconds(5));
    int_cache.put("int_key", 123);
    ASSERT_EQ(int_cache.get("int_key").value(), 123);

    Cache<double> double_cache(std::chrono::seconds(5));
    double_cache.put("double_key", 45.67);
    ASSERT_EQ(double_cache.get("double_key").value(), 45.67);
}

TEST(CacheTest, CustomTTL) {
    Cache<std::string> cache(std::chrono::seconds(100)); // Default long TTL
    cache.put("short_lived", "value", std::chrono::seconds(1)); // Custom short TTL

    std::optional<std::string> value_before = cache.get("short_lived");
    ASSERT_TRUE(value_before.has_value());

    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait past custom TTL

    std::optional<std::string> value_after = cache.get("short_lived");
    ASSERT_FALSE(value_after.has_value()); // Should be expired
    ASSERT_EQ(cache.size(), 0);
}
```