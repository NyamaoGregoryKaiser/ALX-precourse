#include <gtest/gtest.h>
#include <pistache/client.h>
#include <pistache/http.h>
#include <nlohmann/json.hpp>
#include <string>
#include <vector>
#include <thread>
#include <chrono>
#include <stdexcept>

#include "../../src/main.cpp" // Include main to start the server in a separate thread

// Base URL for the API tests
const std::string API_TEST_BASE_URL = "http://localhost:9080";

// Global variables for authentication tokens
std::string admin_token;
std::string editor_token;
std::string viewer_token;

// Utility function to make HTTP requests
nlohmann::json make_request(Pistache::Http::Method method, const std::string& path,
                           const std::string& token = "", const nlohmann::json* body = nullptr) {
    Pistache::Http::Client client;
    client.init();

    std::vector<std::shared_ptr<Pistache::Http::Promise<Pistache::Http::Response>>> responses;

    Pistache::Http::Request req(method, path);
    req.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
    if (!token.empty()) {
        req.headers().add<Pistache::Http::Header::Authorization>("Bearer " + token);
    }
    if (body) {
        req.body() = body->dump();
    }

    auto resp = client.performRequest(req);
    responses.push_back(resp);
    
    // Wait for the response (blocking call for simplicity in test)
    Pistache::Http::Response res = resp->get();
    client.shutdown();

    if (res.code() == Pistache::Http::Code::No_Content) {
        return nlohmann::json(); // Return empty JSON for 204
    }

    return nlohmann::json::parse(res.body());
}

// Test fixture for API tests that requires a running server
class ContentApiTest : public ::testing::Test {
protected:
    static std::thread server_thread;
    static std::atomic<bool> server_ready;

    static void SetUpTestSuite() {
        // Start the server in a separate thread if not already running
        if (!server_ready) {
            server_thread = std::thread([]() {
                try {
                    const auto& config = cms::common::AppConfig::get_instance();
                    Pistache::Address addr(Pistache::Ipv4::any(), Pistache::Port(config.app_port));
                    Pistache::Http::Endpoint server(addr);
                    setup_application(server);
                    server_ready = true;
                    server.serve(); // This blocks the thread until server.shutdown() is called
                } catch (const std::exception& e) {
                    LOG_CRITICAL("Test server thread failed: {}", e.what());
                    server_ready = false; // Mark as failed
                }
            });

            // Wait for the server to be ready
            int retries = 0;
            while (!server_ready && retries < 60) { // Max 30 seconds wait
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
                retries++;
            }
            if (!server_ready) {
                FAIL() << "CMS Server failed to start for API tests.";
            }
            LOG_INFO("CMS Test Server started.");
            
            // Perform initial login to get tokens
            // Admin user from seed.sql: admin / password
            nlohmann::json login_admin_body = {{"username", "admin"}, {"password", "password"}};
            nlohmann::json admin_response = make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/auth/login", "", &login_admin_body);
            admin_token = admin_response["token"].get<std::string>();
            ASSERT_FALSE(admin_token.empty()) << "Failed to get admin token.";
            LOG_INFO("Admin token obtained.");

            // Editor user from seed.sql: editor / password
            nlohmann::json login_editor_body = {{"username", "editor"}, {"password", "password"}};
            nlohmann::json editor_response = make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/auth/login", "", &login_editor_body);
            editor_token = editor_response["token"].get<std::string>();
            ASSERT_FALSE(editor_token.empty()) << "Failed to get editor token.";
            LOG_INFO("Editor token obtained.");

            // Register a viewer for testing
            nlohmann::json register_viewer_body = {{"username", "viewer_test"}, {"email", "viewer@example.com"}, {"password", "password"}};
            nlohmann::json viewer_response = make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/auth/register", "", &register_viewer_body);
            viewer_token = viewer_response["token"].get<std::string>();
            ASSERT_FALSE(viewer_token.empty()) << "Failed to register viewer and get token.";
            LOG_INFO("Viewer token obtained.");


        }
    }

    static void TearDownTestSuite() {
        // Here you would typically shut down the server gracefully.
        // Pistache does not expose a direct `shutdown()` method to external threads easily without
        // modifying the main loop. For demonstration, we'll let the thread terminate with the process.
        // In a more robust test setup, you might run the server in a separate process or use a mock.
        LOG_INFO("Tearing down API Test Suite.");
        if (server_thread.joinable()) {
            // server_thread.join(); // This would block forever without a shutdown mechanism
        }
    }
};

std::thread ContentApiTest::server_thread;
std::atomic<bool> ContentApiTest::server_ready(false);


TEST_F(ContentApiTest, HealthCheckReturnsOk) {
    nlohmann::json response = make_request(Pistache::Http::Method::Get, API_TEST_BASE_URL + "/health", "", nullptr);
    ASSERT_EQ(response, nlohmann::json()); // For string responses, json.parse might fail or be empty
    // Alternatively, you can check raw response body if Pistache client exposes it.
    // For now, we assume success if no exception is thrown and an empty JSON is returned (e.g. for "Ok" status code text)
}

TEST_F(ContentApiTest, CreateContentAsEditor) {
    nlohmann::json new_content = {
        {"title", "API Test Content Title"},
        {"slug", "api-test-content-title-" + cms::common::UUID::generate_v4().substr(0,4)},
        {"body", "This is some test content created via API."},
        {"status", "draft"}
    };
    nlohmann::json response = make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/content", editor_token, &new_content);
    ASSERT_EQ(response["title"], new_content["title"]);
    ASSERT_EQ(response["slug"], new_content["slug"]);
    ASSERT_EQ(response["status"], "draft");
    ASSERT_TRUE(response.contains("id"));
    ASSERT_FALSE(response["id"].get<std::string>().empty());
}

TEST_F(ContentApiTest, CreateContentAsViewerFails) {
    nlohmann::json new_content = {
        {"title", "Viewer Content"},
        {"slug", "viewer-content-" + cms::common::UUID::generate_v4().substr(0,4)},
        {"body", "Viewer should not create."},
        {"status", "published"}
    };
    ASSERT_THROW({
        make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/content", viewer_token, &new_content);
    }, std::runtime_error); // Expecting ForbiddenException which will be rethrown as runtime_error
}

TEST_F(ContentApiTest, GetAllContentAsAdmin) {
    nlohmann::json response = make_request(Pistache::Http::Method::Get, API_TEST_BASE_URL + "/content", admin_token);
    ASSERT_TRUE(response.is_array());
    ASSERT_GE(response.size(), 3); // At least the seeded content
}

TEST_F(ContentApiTest, GetPublishedContentAsViewer) {
    nlohmann::json response = make_request(Pistache::Http::Method::Get, API_TEST_BASE_URL + "/content", viewer_token);
    ASSERT_TRUE(response.is_array());
    for (const auto& item : response) {
        ASSERT_EQ(item["status"], "published");
    }
}

TEST_F(ContentApiTest, GetSingleContentById) {
    // First, create a content
    nlohmann::json new_content = {
        {"title", "Fetchable Content"},
        {"slug", "fetchable-content-" + cms::common::UUID::generate_v4().substr(0,4)},
        {"body", "This content can be fetched."},
        {"status", "published"}
    };
    nlohmann::json create_response = make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/content", admin_token, &new_content);
    std::string content_id = create_response["id"].get<std::string>();

    // Then, fetch it
    nlohmann::json fetch_response = make_request(Pistache::Http::Method::Get, API_TEST_BASE_URL + "/content/" + content_id, viewer_token);
    ASSERT_EQ(fetch_response["id"], content_id);
    ASSERT_EQ(fetch_response["title"], new_content["title"]);
    ASSERT_EQ(fetch_response["status"], "published");
}

TEST_F(ContentApiTest, UpdateContentAsAdmin) {
    // Create content first
    nlohmann::json new_content = {
        {"title", "Updatable Content"},
        {"slug", "updatable-content-" + cms::common::UUID::generate_v4().substr(0,4)},
        {"body", "Original body."},
        {"status", "draft"}
    };
    nlohmann::json create_response = make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/content", admin_token, &new_content);
    std::string content_id = create_response["id"].get<std::string>();

    // Update it
    nlohmann::json update_body = {
        {"title", "Updated Content Title"},
        {"body", "New body content."},
        {"status", "published"}
    };
    nlohmann::json update_response = make_request(Pistache::Http::Method::Put, API_TEST_BASE_URL + "/content/" + content_id, admin_token, &update_body);
    ASSERT_EQ(update_response["id"], content_id);
    ASSERT_EQ(update_response["title"], update_body["title"]);
    ASSERT_EQ(update_response["body"], update_body["body"]);
    ASSERT_EQ(update_response["status"], "published");
}

TEST_F(ContentApiTest, DeleteContentAsAdmin) {
    // Create content first
    nlohmann::json new_content = {
        {"title", "Deletable Content"},
        {"slug", "deletable-content-" + cms::common::UUID::generate_v4().substr(0,4)},
        {"body", "This content will be deleted."},
        {"status", "draft"}
    };
    nlohmann::json create_response = make_request(Pistache::Http::Method::Post, API_TEST_BASE_URL + "/content", admin_token, &new_content);
    std::string content_id = create_response["id"].get<std::string>();

    // Delete it
    nlohmann::json delete_response = make_request(Pistache::Http::Method::Delete, API_TEST_BASE_URL + "/content/" + content_id, admin_token);
    ASSERT_TRUE(delete_response.empty()); // Expecting 204 No Content

    // Verify it's gone
    ASSERT_THROW({
        make_request(Pistache::Http::Method::Get, API_TEST_BASE_URL + "/content/" + content_id, admin_token);
    }, std::runtime_error); // Expecting NotFoundException
}

// Add more API tests for users, media, edge cases, error conditions, rate limiting etc.
```