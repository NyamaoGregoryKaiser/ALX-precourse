#include "gtest/gtest.h"
#include "scraper/HTMLParser.h"
#include "scraper/WebScraper.h"
#include "models/ScrapeJob.h"
#include "utils/HttpUtils.h" // For mock HTTP response
#include <vector>
#include <string>
#include <map>
#include <optional>

// Mock HttpUtils for testing WebScraper without actual network calls
class MockHttpUtils {
public:
    static HttpUtils::HttpResponse mock_get_response;
    static HttpUtils::HttpResponse get(const std::string& url, const std::map<std::string, std::string>& headers = {}) {
        return mock_get_response;
    }
    static HttpUtils::HttpResponse post(const std::string& url, const std::string& body, const std::map<std::string, std::string>& headers = {}) {
        return mock_get_response;
    }
};
HttpUtils::HttpResponse MockHttpUtils::mock_get_response;


// Replace the global HttpUtils::get with MockHttpUtils::get for tests
#define HttpUtils MockHttpUtils

TEST(HTMLParserTest, BasicParsing) {
    HTMLParser parser;
    std::string html = "<html><head><title>Test</title></head><body><h1>Hello</h1><p class='intro'>World</p></body></html>";
    auto root = parser.parse(html);
    ASSERT_TRUE(root);

    // Check for <h1>
    auto h1_elements = root->find_elements("h1");
    ASSERT_EQ(h1_elements.size(), 1);
    ASSERT_EQ(h1_elements[0].text_content, "Hello");

    // Check for <p class='intro'>
    auto p_elements = root->find_elements("p", "intro");
    ASSERT_EQ(p_elements.size(), 1);
    ASSERT_EQ(p_elements[0].text_content, "World");
    ASSERT_TRUE(p_elements[0].has_class("intro"));
}

TEST(HTMLParserTest, NestedElements) {
    HTMLParser parser;
    std::string html = "<div><p><span>Nested</span> Text</p></div>";
    auto root = parser.parse(html);
    ASSERT_TRUE(root);

    auto span_elements = root->find_elements("span");
    ASSERT_EQ(span_elements.size(), 1);
    ASSERT_EQ(span_elements[0].text_content, "Nested");
}

TEST(HTMLParserTest, Attributes) {
    HTMLParser parser;
    std::string html = "<a href='/path' id='mylink' class='button primary'>Link</a>";
    auto root = parser.parse(html);
    ASSERT_TRUE(root);

    auto a_elements = root->find_elements("a");
    ASSERT_EQ(a_elements.size(), 1);
    ASSERT_EQ(a_elements[0].get_attribute("href").value(), "/path");
    ASSERT_EQ(a_elements[0].get_attribute("id").value(), "mylink");
    ASSERT_TRUE(a_elements[0].has_class("button"));
    ASSERT_TRUE(a_elements[0].has_class("primary"));
}

TEST(WebScraperTest, ScrapeSuccess) {
    WebScraper scraper;
    ScrapeJob job;
    job.id = 1;
    job.name = "Test Job";
    job.target_url = "http://test.com";
    job.selectors.push_back({"title", "h1.product-title"});
    job.selectors.push_back({"price", "span.price"});

    // Mock HTTP response
    MockHttpUtils::mock_get_response.status_code = 200;
    MockHttpUtils::mock_get_response.body = "<html><body><h1 class='product-title'>Awesome Product</h1><span class='price'>$99.99</span></body></html>";

    std::vector<ScrapedItem> items = scraper.scrape(job);

    ASSERT_EQ(items.size(), 1);
    ASSERT_EQ(items[0].job_id, job.id);
    ASSERT_EQ(items[0].url, job.target_url);
    ASSERT_EQ(items[0].data.at("title"), "Awesome Product");
    ASSERT_EQ(items[0].data.at("price"), "$99.99");
}

TEST(WebScraperTest, ScrapeFailedHTTP) {
    WebScraper scraper;
    ScrapeJob job;
    job.id = 2;
    job.name = "Failed HTTP Job";
    job.target_url = "http://fail.com";
    job.selectors.push_back({"title", "h1"});

    // Mock HTTP response
    MockHttpUtils::mock_get_response.status_code = 404;
    MockHttpUtils::mock_get_response.body = "Not Found";
    MockHttpUtils::mock_get_response.error_message = "HTTP 404";

    std::vector<ScrapedItem> items = scraper.scrape(job);

    ASSERT_TRUE(items.empty());
}

TEST(WebScraperTest, ScrapeNoMatch) {
    WebScraper scraper;
    ScrapeJob job;
    job.id = 3;
    job.name = "No Match Job";
    job.target_url = "http://nomatch.com";
    job.selectors.push_back({"non_existent", "div.non-existent"});

    // Mock HTTP response
    MockHttpUtils::mock_get_response.status_code = 200;
    MockHttpUtils::mock_get_response.body = "<html><body><div>Some content</div></body></html>";

    std::vector<ScrapedItem> items = scraper.scrape(job);

    ASSERT_EQ(items.size(), 1); // An item is created, but with no data
    ASSERT_TRUE(items[0].data.empty());
}