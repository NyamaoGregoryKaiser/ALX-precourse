#include <gtest/gtest.h>
#include "../../src/common/uuid.hpp"
#include <regex>

TEST(UUIDTest, GenerateValidUUIDv4) {
    std::string uuid = cms::common::UUID::generate_v4();
    ASSERT_EQ(uuid.length(), 36);

    // Regex for UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is one of 8, 9, A, or B
    std::regex uuid_regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
    ASSERT_TRUE(std::regex_match(uuid, uuid_regex));
}

TEST(UUIDTest, GeneratedUUIDsAreUnique) {
    std::string uuid1 = cms::common::UUID::generate_v4();
    std::string uuid2 = cms::common::UUID::generate_v4();
    ASSERT_NE(uuid1, uuid2);
}

TEST(UUIDTest, IsValidUUIDFormat) {
    // Valid UUIDs
    ASSERT_TRUE(cms::common::UUID::is_valid("a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6"));
    ASSERT_TRUE(cms::common::UUID::is_valid("00000000-0000-4000-8000-000000000000"));

    // Invalid length
    ASSERT_FALSE(cms::common::UUID::is_valid("a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c")); // too short
    ASSERT_FALSE(cms::common::UUID::is_valid("a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c67")); // too long

    // Invalid hyphen positions
    ASSERT_FALSE(cms::common::UUID::is_valid("a1b2c3d4e5f6-47a8-b9c0-d1e2f3a4b5c6"));
    ASSERT_FALSE(cms::common::UUID::is_valid("a1b2c3d4-e5f64-7a8-b9c0-d1e2f3a4b5c6"));

    // Invalid characters
    ASSERT_FALSE(cms::common::UUID::is_valid("g1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6")); // 'g' is not hex
    ASSERT_FALSE(cms::common::UUID::is_valid("a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5cZ")); // 'Z' is not hex
    ASSERT_FALSE(cms::common::UUID::is_valid("a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c_")); // '_' is not hex

    // Empty string
    ASSERT_FALSE(cms::common::UUID::is_valid(""));
}
```