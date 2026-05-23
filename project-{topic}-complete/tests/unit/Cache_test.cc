```cpp
#include <gtest/gtest.h>
#include "utils/Cache.h"
#include <chrono>
#include <thread>
#include <drogon/drogon.h>

TEST(CacheTest, InitAndSetGet) {
    CMS::Utils::Cache::init(1); // 1-second expiry for testing
    drogon::HttpResponsePtr resp1 = drogon::HttpResponse::newHttpResponse();
    resp1->setBody("Test Content 1");

    CMS::Utils::Cache::set("key1", resp1);

    drogon::HttpResponsePtr retrievedResp;
    ASSERT_TRUE(CMS::Utils::Cache::get("key1", retrievedResp));
    ASSERT_EQ(retrievedResp->getBody(), "Test Content 1");
}

TEST(CacheTest, ExpiredEntry) {
    CMS::Utils::Cache::init(1); // 1-second expiry
    drogon::HttpResponsePtr resp1 = drogon::HttpResponse::newHttpResponse();
    resp1->setBody("Expired Content");

    CMS::Utils::Cache::set("key_expired", resp1);

    // Wait for cache to expire
    std::this_thread::sleep_for(std::chrono::seconds(2));

    drogon::HttpResponsePtr retrievedResp;
    ASSERT_FALSE(CMS::Utils::Cache::get("key_expired", retrievedResp)); // Should be false as it's expired
}

TEST(CacheTest, RemoveEntry) {
    CMS::Utils::Cache::init(60); // 60-second expiry
    drogon::HttpResponsePtr resp1 = drogon::HttpResponse::newHttpResponse();
    resp1->setBody("Content to be removed");

    CMS::Utils::Cache::set("key_remove", resp1);
    
    drogon::HttpResponsePtr retrievedResp;
    ASSERT_TRUE(CMS::Utils::Cache::get("key_remove", retrievedResp));

    CMS::Utils::Cache::remove("key_remove");
    ASSERT_FALSE(CMS::Utils::Cache::get("key_remove", retrievedResp)); // Should be gone
}

TEST(CacheTest, ClearCache) {
    CMS::Utils::Cache::init(60);
    drogon::HttpResponsePtr resp1 = drogon::HttpResponse::newHttpResponse();
    resp1->setBody("Content 1");
    drogon::HttpResponsePtr resp2 = drogon::HttpResponse::newHttpResponse();
    resp2->setBody("Content 2");

    CMS::Utils::Cache::set("key_clear_1", resp1);
    CMS::Utils::Cache::set("key_clear_2", resp2);

    drogon::HttpResponsePtr retrievedResp;
    ASSERT_TRUE(CMS::Utils::Cache::get("key_clear_1", retrievedResp));
    ASSERT_TRUE(CMS::Utils::Cache::get("key_clear_2", retrievedResp));

    CMS::Utils::Cache::clear();

    ASSERT_FALSE(CMS::Utils::Cache::get("key_clear_1", retrievedResp));
    ASSERT_FALSE(CMS::Utils::Cache::get("key_clear_2", retrievedResp));
}

TEST(CacheTest, UpdateEntry) {
    CMS::Utils::Cache::init(60);
    drogon::HttpResponsePtr resp1 = drogon::HttpResponse::newHttpResponse();
    resp1->setBody("Original Content");
    CMS::Utils::Cache::set("key_update", resp1);

    drogon::HttpResponsePtr resp2 = drogon::HttpResponse::newHttpResponse();
    resp2->setBody("Updated Content");
    CMS::Utils::Cache::set("key_update", resp2); // Overwrite

    drogon::HttpResponsePtr retrievedResp;
    ASSERT_TRUE(CMS::Utils::Cache::get("key_update", retrievedResp));
    ASSERT_EQ(retrievedResp->getBody(), "Updated Content");
}
```