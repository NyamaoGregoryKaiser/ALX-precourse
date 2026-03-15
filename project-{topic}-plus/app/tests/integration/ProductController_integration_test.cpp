#include <gtest/gtest.h>
#include <crow.h>
#include <SQLiteCpp/SQLiteCpp.h>
#include "../../src/controllers/ProductController.h"
#include "../../src/services/ProductService.h"
#include "../../src/services/UserService.h" // Needed for Auth
#include "../../src/services/AuthService.h" // Needed for Auth
#include "../../src/utils/Database.h"
#include "../../src/utils/ErrorHandler.h"
#include "../../src/utils/Middleware.h"
#include "../../src/utils/JWT.h"
#include "../../src/app_config.h"
#include <thread>
#include <chrono>

// Mock the App for testing Crow handlers in isolation
class MockApp : public crow::App<
    ErrorHandlerMiddleware,
    LoggingMiddleware,
    RateLimitMiddleware,
    AuthMiddleware
> {
public:
    void handle(crow::request& req, crow::response& res) {
        // Create context explicitly for middleware
        AuthMiddleware::context auth_ctx;
        LoggingMiddleware::context log_ctx;
        RateLimitMiddleware::context rate_ctx;

        // Manually run middleware before_handle
        get_middleware<AuthMiddleware>().before_handle(req, res, auth_ctx);
        get_middleware<LoggingMiddleware>().before_handle(req, res, log_ctx);
        get_middleware<RateLimitMiddleware>().before_handle(req, res, rate_ctx);
        
        // If any middleware wrote a response (e.g., rate limit exceeded), don't proceed
        if (res.is_completed()) {
            return;
        }

        // Call the actual route handler (needs to be done dynamically or via a wrapper)
        // For these tests, we will pass the context directly to controller methods.
        // This MockApp itself won't route, it just sets up the context for controller.
    }
};

class ProductControllerIntegrationTest : public ::testing::Test {
protected:
    Database& db_instance = Database::getTestInstance();
    UserService* user_service;
    AuthService* auth_service;
    ProductService* product_service;
    ProductController* product_controller;
    
    // For JWT tokens
    std::string admin_token;
    std::string user_token;

    void SetUp() override {
        // Initialize the test database before each test
        db_instance.applySchemaAndSeed("db/schema.sql", "db/seed.sql");
        user_service = new UserService(db_instance);
        auth_service = new AuthService(*user_service);
        product_service = new ProductService(db_instance);
        product_controller = new ProductController(*product_service);

        // Generate tokens for admin and regular user
        auto admin_login_result = auth_service->loginUser("admin", "adminpass");
        admin_token = admin_login_result.second;

        auto user_login_result = auth_service->loginUser("john_doe", "userpass");
        user_token = user_login_result.second;

        LOG_INFO("ProductControllerIntegrationTest Setup complete.");
    }

    void TearDown() override {
        delete product_controller;
        delete product_service;
        delete auth_service;
        delete user_service;
        LOG_INFO("ProductControllerIntegrationTest TearDown complete.");
    }

    // Helper to simulate a request and get a response
    crow::response simulateRequest(
        const std::string& method,
        const std::string& url,
        const std::string& body = "",
        const std::string& auth_token = ""
    ) {
        crow::request req;
        req.method = crow::method_from_string(method);
        req.url = url;
        req.body = body;
        if (!auth_token.empty()) {
            req.add_header("Authorization", "Bearer " + auth_token);
        }
        req.add_header("Content-Type", "application/json");

        crow::response res;
        AuthMiddleware::context ctx; // Manually create context

        // Simulate AuthMiddleware
        AuthMiddleware auth_middleware;
        auth_middleware.before_handle(req, res, ctx);

        // If auth middleware sent a response (e.g., rate limit, unauth), return it.
        // For ProductController, if token is invalid, it throws UnauthorizedException.
        // This is handled by ErrorHandlerMiddleware. We need to wrap controller calls in try-catch.
        try {
            if (method == "POST" && url == "/products") {
                product_controller->createProduct(req, res, ctx);
            } else if (method == "GET" && url == "/products") {
                product_controller->getAllProducts(req, res, ctx);
            } else if (method == "GET" && url.rfind("/products/", 0) == 0) {
                long long id = std::stoll(url.substr(url.rfind('/') + 1));
                product_controller->getProductById(req, res, ctx, id);
            } else if (method == "PUT" && url.rfind("/products/", 0) == 0) {
                long long id = std::stoll(url.substr(url.rfind('/') + 1));
                product_controller->updateProduct(req, res, ctx, id);
            } else if (method == "DELETE" && url.rfind("/products/", 0) == 0) {
                long long id = std::stoll(url.substr(url.rfind('/') + 1));
                product_controller->deleteProduct(req, res, ctx, id);
            } else {
                res.code = crow::status::NOT_FOUND;
                res.write("{\"error\": \"Not Found\", \"message\": \"Route not simulated\"}");
            }
        } catch (const AppException& e) {
            res.code = static_cast<crow::status>(e.status_code);
            res.set_header("Content-Type", "application/json");
            res.write(e.to_json().dump());
        } catch (const std::exception& e) {
            res.code = crow::status::INTERNAL_SERVER_ERROR;
            res.set_header("Content-Type", "application/json");
            res.write(InternalServerException(e.what()).to_json().dump());
        } catch (...) {
            res.code = crow::status::INTERNAL_SERVER_ERROR;
            res.set_header("Content-Type", "application/json");
            res.write(InternalServerException("An unexpected error occurred.").to_json().dump());
        }
        return res;
    }
};

// --- GET /products (Get all products) ---
TEST_F(ProductControllerIntegrationTest, GetAllProductsSuccessfully) {
    LOG_INFO("Running test: GetAllProductsSuccessfully");
    crow::response res = simulateRequest("GET", "/products", "", user_token);
    ASSERT_EQ(res.code, crow::status::OK);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_TRUE(json_res.is_array());
    ASSERT_EQ(json_res.size(), 4); // 4 products from seed data
}

TEST_F(ProductControllerIntegrationTest, GetAllProductsWithoutTokenFails) {
    LOG_INFO("Running test: GetAllProductsWithoutTokenFails");
    crow::response res = simulateRequest("GET", "/products", "", "");
    ASSERT_EQ(res.code, crow::status::UNAUTHORIZED);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Unauthorized");
}

// --- GET /products/{id} (Get product by ID) ---
TEST_F(ProductControllerIntegrationTest, GetProductByIdSuccessfully) {
    LOG_INFO("Running test: GetProductByIdSuccessfully");
    crow::response res = simulateRequest("GET", "/products/1", "", user_token); // Laptop Pro X is ID 1
    ASSERT_EQ(res.code, crow::status::OK);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["name"].s(), "Laptop Pro X");
}

TEST_F(ProductControllerIntegrationTest, GetNonExistentProductByIdFails) {
    LOG_INFO("Running test: GetNonExistentProductByIdFails");
    crow::response res = simulateRequest("GET", "/products/999", "", user_token);
    ASSERT_EQ(res.code, crow::status::NOT_FOUND);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Not Found");
}

// --- POST /products (Create product) ---
TEST_F(ProductControllerIntegrationTest, CreateProductAsAdminSuccessfully) {
    LOG_INFO("Running test: CreateProductAsAdminSuccessfully");
    std::string product_body = R"({"name": "New Gaming Headset", "description": "High-fidelity audio.", "price": 120.00, "stock_quantity": 150})";
    crow::response res = simulateRequest("POST", "/products", product_body, admin_token);
    ASSERT_EQ(res.code, crow::status::CREATED);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["name"].s(), "New Gaming Headset");
    ASSERT_GT(json_res["id"].i(), 0);

    // Verify it's in the DB
    auto created_product = product_service->getProductById(json_res["id"].i());
    ASSERT_TRUE(created_product.has_value());
    ASSERT_EQ(created_product->name, "New Gaming Headset");
}

TEST_F(ProductControllerIntegrationTest, CreateProductAsUserFails) {
    LOG_INFO("Running test: CreateProductAsUserFails");
    std::string product_body = R"({"name": "Forbidden Product", "price": 10.00, "stock_quantity": 10})";
    crow::response res = simulateRequest("POST", "/products", product_body, user_token);
    ASSERT_EQ(res.code, crow::status::FORBIDDEN);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Forbidden");
}

TEST_F(ProductControllerIntegrationTest, CreateProductWithInvalidDataFails) {
    LOG_INFO("Running test: CreateProductWithInvalidDataFails");
    std::string product_body = R"({"name": "Invalid Product", "price": -10.00, "stock_quantity": 10})"; // Negative price
    crow::response res = simulateRequest("POST", "/products", product_body, admin_token);
    ASSERT_EQ(res.code, crow::status::BAD_REQUEST);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Bad Request");
}

TEST_F(ProductControllerIntegrationTest, CreateProductWithDuplicateNameFails) {
    LOG_INFO("Running test: CreateProductWithDuplicateNameFails");
    std::string product_body = R"({"name": "Laptop Pro X", "price": 100.00, "stock_quantity": 10})"; // Name already exists
    crow::response res = simulateRequest("POST", "/products", product_body, admin_token);
    ASSERT_EQ(res.code, crow::status::CONFLICT);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Conflict");
}

// --- PUT /products/{id} (Update product) ---
TEST_F(ProductControllerIntegrationTest, UpdateProductAsAdminSuccessfully) {
    LOG_INFO("Running test: UpdateProductAsAdminSuccessfully");
    // Product ID 2: Mechanical Keyboard
    std::string update_body = R"({"price": 99.99, "stock_quantity": 180})";
    crow::response res = simulateRequest("PUT", "/products/2", update_body, admin_token);
    ASSERT_EQ(res.code, crow::status::OK);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["price"].d(), 99.99);
    ASSERT_EQ(json_res["stock_quantity"].i(), 180);

    // Verify it's updated in the DB
    auto updated_product = product_service->getProductById(2);
    ASSERT_TRUE(updated_product.has_value());
    ASSERT_EQ(updated_product->price, 99.99);
}

TEST_F(ProductControllerIntegrationTest, UpdateProductAsUserFails) {
    LOG_INFO("Running test: UpdateProductAsUserFails");
    std::string update_body = R"({"price": 10.00})";
    crow::response res = simulateRequest("PUT", "/products/1", update_body, user_token);
    ASSERT_EQ(res.code, crow::status::FORBIDDEN);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Forbidden");
}

TEST_F(ProductControllerIntegrationTest, UpdateNonExistentProductFails) {
    LOG_INFO("Running test: UpdateNonExistentProductFails");
    std::string update_body = R"({"price": 10.00})";
    crow::response res = simulateRequest("PUT", "/products/999", update_body, admin_token);
    ASSERT_EQ(res.code, crow::status::NOT_FOUND);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Not Found");
}

// --- DELETE /products/{id} (Delete product) ---
TEST_F(ProductControllerIntegrationTest, DeleteProductAsAdminSuccessfully) {
    LOG_INFO("Running test: DeleteProductAsAdminSuccessfully");
    // Product ID 3: Wireless Mouse
    crow::response res = simulateRequest("DELETE", "/products/3", "", admin_token);
    ASSERT_EQ(res.code, crow::status::NO_CONTENT);

    // Verify it's deleted from DB
    auto deleted_product = product_service->getProductById(3);
    ASSERT_FALSE(deleted_product.has_value());
}

TEST_F(ProductControllerIntegrationTest, DeleteProductAsUserFails) {
    LOG_INFO("Running test: DeleteProductAsUserFails");
    crow::response res = simulateRequest("DELETE", "/products/1", "", user_token);
    ASSERT_EQ(res.code, crow::status::FORBIDDEN);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Forbidden");
}

TEST_F(ProductControllerIntegrationTest, DeleteNonExistentProductFails) {
    LOG_INFO("Running test: DeleteNonExistentProductFails");
    crow::response res = simulateRequest("DELETE", "/products/999", "", admin_token);
    ASSERT_EQ(res.code, crow::status::NOT_FOUND);
    crow::json::rvalue json_res = crow::json::load(res.body);
    ASSERT_EQ(json_res["error"].s(), "Not Found");
}