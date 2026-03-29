```cpp
#include "gtest/gtest.h"
#include "../../src/server/utils/JsonUtils.h"
#include <crow.h> // Mock Crow requests/responses

TEST(JsonUtilsTest, CreateSuccessResponseNoData) {
    json response = JsonUtils::createSuccessResponse("Test message");
    ASSERT_EQ(response["status"], "success");
    ASSERT_EQ(response["message"], "Test message");
    ASSERT_FALSE(response.contains("data"));
}

TEST(JsonUtilsTest, CreateSuccessResponseWithData) {
    json test_data;
    test_data["key"] = "value";
    test_data["id"] = 123;
    json response = JsonUtils::createSuccessResponse("Test message with data", test_data);
    ASSERT_EQ(response["status"], "success");
    ASSERT_EQ(response["message"], "Test message with data");
    ASSERT_TRUE(response.contains("data"));
    ASSERT_EQ(response["data"]["key"], "value");
    ASSERT_EQ(response["data"]["id"], 123);
}

TEST(JsonUtilsTest, CreateErrorResponseDefaultCode) {
    json response = JsonUtils::createErrorResponse("Error message");
    ASSERT_EQ(response["status"], "error");
    ASSERT_EQ(response["message"], "Error message");
    ASSERT_EQ(response["statusCode"], 500);
}

TEST(JsonUtilsTest, CreateErrorResponseSpecificCode) {
    json response = JsonUtils::createErrorResponse("Not found", 404);
    ASSERT_EQ(response["status"], "error");
    ASSERT_EQ(response["message"], "Not found");
    ASSERT_EQ(response["statusCode"], 404);
}

TEST(JsonUtilsTest, ParseRequestBodyValidJson) {
    crow::request req;
    req.body = R"({"name": "test", "value": 123})";
    crow::response res;
    json out_json;

    bool result = JsonUtils::parseRequestBody(req, out_json, res);
    ASSERT_TRUE(result);
    ASSERT_EQ(res.code, 200); // Default Crow response code
    ASSERT_EQ(out_json["name"], "test");
    ASSERT_EQ(out_json["value"], 123);
}

TEST(JsonUtilsTest, ParseRequestBodyInvalidJson) {
    crow::request req;
    req.body = R"({"name": "test", "value": 123,)"; // Malformed JSON
    crow::response res;
    json out_json;

    bool result = JsonUtils::parseRequestBody(req, out_json, res);
    ASSERT_FALSE(result);
    ASSERT_EQ(res.code, 400); // Bad Request
    ASSERT_TRUE(res.body.find("Invalid JSON format") != std::string::npos); // Check error message
}

TEST(JsonUtilsTest, ParseRequestBodyEmptyBody) {
    crow::request req;
    req.body = "";
    crow::response res;
    json out_json;

    bool result = JsonUtils::parseRequestBody(req, out_json, res);
    // Crow's json::parse on empty string might yield an empty json object or throw an error depending on nlohmann/json version.
    // For this test, assume it produces an error.
    ASSERT_FALSE(result);
    ASSERT_EQ(res.code, 400);
    ASSERT_TRUE(res.body.find("Invalid JSON format") != std::string::npos);
}
```