```cpp
#include "gtest/gtest.h"
#include "utils/JsonUtils.h"
#include "utils/Logger.h"

class JsonUtilsTest : public ::testing::Test {
protected:
    void SetUp() override {
        Logger::init();
    }
};

TEST_F(JsonUtilsTest, ParseValidJsonString) {
    std::string json_str = R"({"name": "Test", "age": 30, "isStudent": false})";
    Json::Value root = JsonUtils::parseJson(json_str);

    ASSERT_TRUE(root.isObject());
    ASSERT_TRUE(root.isMember("name"));
    ASSERT_EQ(root["name"].asString(), "Test");
    ASSERT_TRUE(root.isMember("age"));
    ASSERT_EQ(root["age"].asInt(), 30);
    ASSERT_TRUE(root.isMember("isStudent"));
    ASSERT_FALSE(root["isStudent"].asBool());
}

TEST_F(JsonUtilsTest, ParseInvalidJsonString) {
    std::string invalid_json_str = R"({"name": "Test", "age": 30,)"; // Malformed JSON
    ASSERT_THROW(JsonUtils::parseJson(invalid_json_str), std::runtime_error);

    invalid_json_str = "not json";
    ASSERT_THROW(JsonUtils::parseJson(invalid_json_str), std::runtime_error);
}

TEST_F(JsonUtilsTest, StringifyJsonValue) {
    Json::Value root;
    root["name"] = "Example";
    root["count"] = 5;
    root["enabled"] = true;

    std::string json_str = JsonUtils::stringifyJson(root);

    // We can't guarantee exact formatting (spaces, newlines),
    // so we parse it back to compare values.
    Json::Value parsed_root = JsonUtils::parseJson(json_str);

    ASSERT_TRUE(parsed_root.isObject());
    ASSERT_EQ(parsed_root["name"].asString(), "Example");
    ASSERT_EQ(parsed_root["count"].asInt(), 5);
    ASSERT_EQ(parsed_root["enabled"].asBool(), true);
}

TEST_F(JsonUtilsTest, StringifyEmptyJsonValue) {
    Json::Value root; // Empty object
    std::string json_str = JsonUtils::stringifyJson(root);
    ASSERT_EQ(json_str, "{}");
}

TEST_F(JsonUtilsTest, GetStringField) {
    Json::Value root;
    root["key"] = "value";
    ASSERT_EQ(JsonUtils::getStringField(root, "key"), "value");
    ASSERT_EQ(JsonUtils::getStringField(root, "non_existent", "default"), "default");
    ASSERT_THROW(JsonUtils::getStringField(root, "non_existent"), std::runtime_error);
}

TEST_F(JsonUtilsTest, GetIntField) {
    Json::Value root;
    root["key"] = 123;
    ASSERT_EQ(JsonUtils::getIntField(root, "key"), 123);
    ASSERT_EQ(JsonUtils::getIntField(root, "non_existent", 0), 0);
    ASSERT_THROW(JsonUtils::getIntField(root, "non_existent"), std::runtime_error);

    root["string_key"] = "not_an_int";
    ASSERT_THROW(JsonUtils::getIntField(root, "string_key"), std::runtime_error);
}

TEST_F(JsonUtilsTest, GetBoolField) {
    Json::Value root;
    root["key"] = true;
    ASSERT_EQ(JsonUtils::getBoolField(root, "key"), true);
    ASSERT_EQ(JsonUtils::getBoolField(root, "non_existent", false), false);
    ASSERT_THROW(JsonUtils::getBoolField(root, "non_existent"), std::runtime_error);

    root["string_key"] = "not_a_bool";
    ASSERT_THROW(JsonUtils::getBoolField(root, "string_key"), std::runtime_error);
}

TEST_F(JsonUtilsTest, GetOptionalStringField) {
    Json::Value root;
    root["key"] = "value";
    ASSERT_EQ(JsonUtils::getOptionalStringField(root, "key"), "value");
    ASSERT_FALSE(JsonUtils::getOptionalStringField(root, "non_existent").has_value());
    ASSERT_FALSE(JsonUtils::getOptionalStringField(root, "null_key").has_value()); // A null value
}

TEST_F(JsonUtilsTest, GetOptionalIntField) {
    Json::Value root;
    root["key"] = 123;
    ASSERT_EQ(JsonUtils::getOptionalIntField(root, "key"), 123);
    ASSERT_FALSE(JsonUtils::getOptionalIntField(root, "non_existent").has_value());
    ASSERT_FALSE(JsonUtils::getOptionalIntField(root, "null_key").has_value());
}
```