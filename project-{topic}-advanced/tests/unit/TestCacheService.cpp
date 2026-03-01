#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../../src/services/CacheService.h"
#include <thread>
#include <chrono>

TEST(CacheServiceTest, InitAndPutGet) {
    CacheService::init(1); // Set default TTL to 1 second
    CacheService::clear(); // Start with a clean cache

    Json::Value data;
    data["value"] = "testdata";
    CacheService::put("key1", data);

    auto retrieved = CacheService::get("key1");
    ASSERT_TRUE(retrieved.has_value());
    ASSERT_EQ(retrieved.value()["value"].asString(), "testdata");

    // Test non-existent key
    auto nonExistent = CacheService::get("key_non_existent");
    ASSERT_FALSE(nonExistent.has_value());
}

TEST(CacheServiceTest, Expiration) {
    CacheService::init(1); // Default TTL 1 second
    CacheService::clear();

    Json::Value data;
    data["value"] = "expiring_data";
    CacheService::put("key_exp", data, 1); // Specific TTL 1 second

    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for expiration

    auto retrieved = CacheService::get("key_exp");
    ASSERT_FALSE(retrieved.has_value()); // Should be expired
}

TEST(CacheServiceTest, Remove) {
    CacheService::init(60);
    CacheService::clear();

    Json::Value data;
    data["value"] = "removable_data";
    CacheService::put("key_remove", data);

    ASSERT_TRUE(CacheService::get("key_remove").has_value());

    CacheService::remove("key_remove");
    ASSERT_FALSE(CacheService::get("key_remove").has_value());
}

TEST(CacheServiceTest, Clear) {
    CacheService::init(60);
    CacheService::clear();

    Json::Value data1; data1["val"] = 1;
    Json::Value data2; data2["val"] = 2;
    CacheService::put("k1", data1);
    CacheService::put("k2", data2);

    ASSERT_TRUE(CacheService::get("k1").has_value());
    ASSERT_TRUE(CacheService::get("k2").has_value());

    CacheService::clear();
    ASSERT_FALSE(CacheService::get("k1").has_value());
    ASSERT_FALSE(CacheService::get("k2").has_value());
}

TEST(CacheServiceTest, Cleanup) {
    CacheService::init(1);
    CacheService::clear();

    Json::Value data1; data1["val"] = "active";
    Json::Value data2; data2["val"] = "expired";

    CacheService::put("k_active", data1, 10); // Will remain active
    CacheService::put("k_expired", data2, 1);  // Will expire

    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for k_expired to expire

    CacheService::cleanup(); // Should remove k_expired

    ASSERT_TRUE(CacheService::get("k_active").has_value());
    ASSERT_FALSE(CacheService::get("k_expired").has_value()); // Should be removed by cleanup
}

TEST(CacheServiceTest, PutWithZeroTTLUsesDefault) {
    CacheService::init(2); // Default TTL 2 seconds
    CacheService::clear();

    Json::Value data;
    data["value"] = "default_ttl_data";
    CacheService::put("key_default", data, 0); // Use default TTL

    // Should still be present after 1 second
    std::this_thread::sleep_for(std::chrono::seconds(1));
    ASSERT_TRUE(CacheService::get("key_default").has_value());

    // Should expire after 2 seconds
    std::this_thread::sleep_for(std::chrono::seconds(2));
    ASSERT_FALSE(CacheService::get("key_default").has_value());
}
```