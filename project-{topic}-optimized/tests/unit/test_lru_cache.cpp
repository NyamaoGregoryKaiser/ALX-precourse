#include <gtest/gtest.h>
#include "../../src/cache/lru_cache.hpp"
#include <string>

TEST(LRUCacheTest, EmptyCache) {
    cms::cache::LRUCache<std::string, int> cache(5);
    ASSERT_EQ(cache.size(), 0);
    ASSERT_FALSE(cache.get("key1"));
}

TEST(LRUCacheTest, PutAndGet) {
    cms::cache::LRUCache<std::string, int> cache(5);
    cache.put("key1", 100);
    ASSERT_EQ(cache.size(), 1);
    ASSERT_TRUE(cache.get("key1"));
    ASSERT_EQ(*cache.get("key1"), 100);
}

TEST(LRUCacheTest, LRUEviction) {
    cms::cache::LRUCache<std::string, int> cache(3);
    cache.put("key1", 1);
    cache.put("key2", 2);
    cache.put("key3", 3);
    ASSERT_EQ(cache.size(), 3);

    // key1 is now LRU
    cache.put("key4", 4); // key1 should be evicted
    ASSERT_EQ(cache.size(), 3);
    ASSERT_FALSE(cache.get("key1")); // key1 should be gone
    ASSERT_TRUE(cache.get("key2"));
    ASSERT_TRUE(cache.get("key3"));
    ASSERT_TRUE(cache.get("key4"));
}

TEST(LRUCacheTest, AccessUpdatesRecency) {
    cms::cache::LRUCache<std::string, int> cache(3);
    cache.put("key1", 1); // 1 is LRU
    cache.put("key2", 2);
    cache.put("key3", 3); // 3 is MRU

    // Access key1, it should become MRU
    ASSERT_TRUE(cache.get("key1")); // order: 3, 2, 1 (LRU) -> 2, 3, 1 (MRU) after get 1

    cache.put("key4", 4); // Evicts key2
    ASSERT_FALSE(cache.get("key2")); // key2 should be gone
    ASSERT_TRUE(cache.get("key1"));
    ASSERT_TRUE(cache.get("key3"));
    ASSERT_TRUE(cache.get("key4")); // key4 should be present
}

TEST(LRUCacheTest, UpdateExistingKey) {
    cms::cache::LRUCache<std::string, int> cache(3);
    cache.put("key1", 1);
    cache.put("key2", 2);

    // Update key1
    cache.put("key1", 10);
    ASSERT_EQ(cache.size(), 2);
    ASSERT_TRUE(cache.get("key1"));
    ASSERT_EQ(*cache.get("key1"), 10); // Check updated value
    
    // key1 should now be MRU
    cache.put("key3", 3);
    cache.put("key4", 4); // key2 should be evicted (LRU after update of key1)
    ASSERT_FALSE(cache.get("key2"));
    ASSERT_TRUE(cache.get("key1"));
    ASSERT_TRUE(cache.get("key3"));
    ASSERT_TRUE(cache.get("key4"));
}

TEST(LRUCacheTest, RemoveKey) {
    cms::cache::LRUCache<std::string, int> cache(3);
    cache.put("key1", 1);
    cache.put("key2", 2);
    cache.put("key3", 3);

    cache.remove("key2");
    ASSERT_EQ(cache.size(), 2);
    ASSERT_FALSE(cache.get("key2"));
    ASSERT_TRUE(cache.get("key1"));
    ASSERT_TRUE(cache.get("key3"));

    // Add new item, should not evict key1 or key3 since there's space
    cache.put("key4", 4);
    ASSERT_EQ(cache.size(), 3);
    ASSERT_TRUE(cache.get("key1"));
    ASSERT_TRUE(cache.get("key3"));
    ASSERT_TRUE(cache.get("key4"));
}

TEST(LRUCacheTest, ClearCache) {
    cms::cache::LRUCache<std::string, int> cache(5);
    cache.put("key1", 1);
    cache.put("key2", 2);
    ASSERT_EQ(cache.size(), 2);

    cache.clear();
    ASSERT_EQ(cache.size(), 0);
    ASSERT_FALSE(cache.get("key1"));
    ASSERT_FALSE(cache.get("key2"));
}

TEST(LRUCacheTest, ZeroCapacityCache) {
    cms::cache::LRUCache<std::string, int> cache(0);
    cache.put("key1", 1);
    ASSERT_EQ(cache.size(), 0); // Should not add anything
    ASSERT_FALSE(cache.get("key1"));
}

TEST(LRUCacheTest, CacheWithComplexObjects) {
    struct UserData {
        int id;
        std::string name;
        bool operator==(const UserData& other) const {
            return id == other.id && name == other.name;
        }
    };

    cms::cache::LRUCache<int, UserData> cache(2);
    cache.put(1, {1, "Alice"});
    cache.put(2, {2, "Bob"});

    ASSERT_EQ(cache.size(), 2);
    ASSERT_TRUE(cache.get(1));
    ASSERT_EQ(cache.get(1)->name, "Alice");

    cache.put(3, {3, "Charlie"}); // Evicts Alice
    ASSERT_EQ(cache.size(), 2);
    ASSERT_FALSE(cache.get(1));
    ASSERT_TRUE(cache.get(2));
    ASSERT_TRUE(cache.get(3));
}
```