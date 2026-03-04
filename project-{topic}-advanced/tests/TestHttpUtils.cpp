```cpp
#include "gtest/gtest.h"
#include "HttpUtils.h"
#include "Logger.h" // For ScopedLogDisabler
#include <map>
#include <string>

// ScopedLogDisabler from TestModels.cpp

TEST(HttpUtilsTest, GetStatusMessage) {
    ScopedLogDisabler disabler;
    ASSERT_EQ(VisGenius::get_status_message(200), "OK");
    ASSERT_EQ(VisGenius::get_status_message(404), "Not Found");
    ASSERT_EQ(VisGenius::get_status_message(500), "Internal Server Error");
    ASSERT_EQ(VisGenius::get_status_message(999), "Unknown Status");
}

TEST(HttpUtilsTest, ParseHttpRequestBasicGET) {
    ScopedLogDisabler disabler;
    std::string raw_request = "GET /index.html HTTP/1.1\r\nHost: example.com\r\n\r\n";
    VisGenius::HttpRequest req = VisGenius::parse_http_request(raw_request);

    ASSERT_EQ(req.method, "GET");
    ASSERT_EQ(req.path, "/index.html");
    ASSERT_EQ(req.version, "HTTP/1.1");
    ASSERT_EQ(req.headers.at("host"), "example.com");
    ASSERT_TRUE(req.body.empty());
}

TEST(HttpUtilsTest, ParseHttpRequestPOSTWithBody) {
    ScopedLogDisabler disabler;
    std::string raw_request = "POST /api/data HTTP/1.1\r\nContent-Type: application/json\r\nContent-Length: 17\r\n\r\n{\"key\":\"value\"}";
    VisGenius::HttpRequest req = VisGenius::parse_http_request(raw_request);

    ASSERT_EQ(req.method, "POST");
    ASSERT_EQ(req.path, "/api/data");
    ASSERT_EQ(req.headers.at("content-type"), "application/json");
    ASSERT_EQ(req.headers.at("content-length"), "17");
    ASSERT_EQ(req.body, "{\"key\":\"value\"}");
}

TEST(HttpUtilsTest, ParseHttpRequestWithQueryParameters) {
    ScopedLogDisabler disabler;
    std::string raw_request = "GET /search?q=test&page=1 HTTP/1.1\r\nHost: example.com\r\n\r\n";
    VisGenius::HttpRequest req = VisGenius::parse_http_request(raw_request);

    ASSERT_EQ(req.method, "GET");
    ASSERT_EQ(req.path, "/search");
    ASSERT_EQ(req.query_params.at("q"), "test");
    ASSERT_EQ(req.query_params.at("page"), "1");
}

TEST(HttpUtilsTest, ParseHttpRequestWithAuthHeader) {
    ScopedLogDisabler disabler;
    std::string raw_request = "GET /api/users HTTP/1.1\r\nAuthorization: Bearer abc123def456\r\n\r\n";
    VisGenius::HttpRequest req = VisGenius::parse_http_request(raw_request);

    ASSERT_EQ(req.headers.at("authorization"), "Bearer abc123def456");
}

TEST(HttpUtilsTest, HttpResponseToString) {
    ScopedLogDisabler disabler;
    VisGenius::HttpResponse res;
    res.status_code = 200;
    res.status_message = "OK";
    res.set_content_type("text/plain");
    res.set_body("Hello, World!");

    std::string expected = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 13\r\n\r\nHello, World!";
    ASSERT_EQ(res.to_string(), expected);
}

TEST(HttpUtilsTest, HttpResponseWithNoBody) {
    ScopedLogDisabler disabler;
    VisGenius::HttpResponse res;
    res.status_code = 204;
    res.status_message = "No Content";

    std::string expected = "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\n\r\n"; // Content-Length should be 0
    ASSERT_EQ(res.to_string(), expected);
}

TEST(HttpUtilsTest, UrlDecodeBasic) {
    ScopedLogDisabler disabler;
    ASSERT_EQ(VisGenius::url_decode("hello%20world"), "hello world");
    ASSERT_EQ(VisGenius::url_decode("test+param"), "test param");
    ASSERT_EQ(VisGenius::url_decode("%2Fpath%2Fto%2Fresource"), "/path/to/resource");
    ASSERT_EQ(VisGenius::url_decode("no_encoding_needed"), "no_encoding_needed");
}

TEST(HttpUtilsTest, ParseQueryParams) {
    ScopedLogDisabler disabler;
    std::string query_string = "name=John%20Doe&age=30&city=New+York";
    std::map<std::string, std::string> params = VisGenius::parse_query_params(query_string);

    ASSERT_EQ(params.size(), 3);
    ASSERT_EQ(params["name"], "John Doe");
    ASSERT_EQ(params["age"], "30");
    ASSERT_EQ(params["city"], "New York");
}

TEST(HttpUtilsTest, ParseQueryParamsEmpty) {
    ScopedLogDisabler disabler;
    std::string query_string = "";
    std::map<std::string, std::string> params = VisGenius::parse_query_params(query_string);
    ASSERT_TRUE(params.empty());
}

TEST(HttpUtilsTest, ParseQueryParamsWithNoValue) {
    ScopedLogDisabler disabler;
    std::string query_string = "param1&param2=value2";
    std::map<std::string, std::string> params = VisGenius::parse_query_params(query_string);
    ASSERT_EQ(params.size(), 2);
    ASSERT_EQ(params["param1"], "");
    ASSERT_EQ(params["param2"], "value2");
}
```