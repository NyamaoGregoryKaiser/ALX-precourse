```cpp
#include "gtest/gtest.h"
#include "../../src/backend/services/auth_service.h"
#include "../../src/backend/db/db_manager.h"
#include "../../src/backend/middleware/error_middleware.h"
#include <memory>
#include <optional>
#include <map>

// Mock DBManager for AuthService unit tests
class MockDBManager : public DBManager {
public:
    MockDBManager() : DBManager("", "", "", "", "") {} // Dummy connection string

    // Mocked methods
    User create_user(const User& user) override {
        // Simulate DB behavior: assign ID, hash password, return
        User new_user = user;
        new_user.id = ++next_user_id_;
        new_user.created_at = std::chrono::system_clock::now();
        new_user.updated_at = new_user.created_at;
        users_[new_user.email] = new_user;
        return new_user;
    }

    std::optional<User> find_user_by_email(const std::string& email) override {
        auto it = users_.find(email);
        if (it != users_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

    bool check_user_exists_by_email(const std::string& email) override {
        return users_.count(email) > 0;
    }

    bool check_user_exists_by_username(const std::string& username) override {
        for (const auto& pair : users_) {
            if (pair.second.username == username) {
                return true;
            }
        }
        return false;
    }

    // Unused in Auth Service, but needed to satisfy interface
    void connect() override {}
    pqxx::result exec_query(const std::string& query) override { return pqxx::result(); }
    pqxx::result exec_params(const std::string& query, const pqxx::params& params) override { return pqxx::result(); }
    pqxx::work begin_transaction() override {
        // Return a dummy work object, actual commit/abort won't do anything
        // For real mocks, you might use a mock_connection.
        throw std::runtime_error("Transactions not supported in mock for this test.");
    }

    // Other DBManager methods (e.g., product, order, cart) would also be mocked if needed.
    std::optional<User> find_user_by_id(int id) override { return std::nullopt; }
    Product create_product(const Product& product) override { return Product(); }
    std::optional<Product> get_product_by_id(int id) override { return std::nullopt; }
    std::vector<Product> get_all_products(const std::string& search_term, int limit, int offset) override { return {}; }
    Product update_product(const Product& product) override { return Product(); }
    void delete_product(int id) override {}
    void decrease_product_stock(int product_id, int quantity, pqxx::work& tx) override {}
    void increase_product_stock(int product_id, int quantity, pqxx::work& tx) override {}
    Cart get_or_create_user_cart(int user_id) override { return Cart(); }
    std::optional<Cart> get_user_cart_with_items(int user_id) override { return std::nullopt; }
    CartItem add_or_update_cart_item(int cart_id, int product_id, int quantity) override { return CartItem(); }
    void remove_cart_item(int cart_id, int product_id) override {}
    void clear_cart_items(int cart_id, pqxx::work& tx) override {}
    Order create_order(int user_id, double total_amount, OrderStatus status, pqxx::work& tx) override { return Order(); }
    void create_order_item(int order_id, int product_id, int quantity, double price, pqxx::work& tx) override {}
    std::vector<Order> get_user_orders(int user_id) override { return {}; }
    std::optional<Order> get_order_by_id(int order_id) override { return std::nullopt; }
    std::vector<OrderItem> get_order_items(int order_id) override { return {}; }


    // Public access to internal state for testing
    std::map<std::string, User> users_;
    int next_user_id_ = 0;
};

// Global logger for tests
std::shared_ptr<spdlog::logger> test_logger;

// Set up a test fixture
class AuthServiceTest : public ::testing::Test {
protected:
    std::unique_ptr<MockDBManager> mock_db_manager_;
    std::unique_ptr<AuthService> auth_service_;
    const std::string jwt_secret_ = "a_very_secret_key_for_testing_jwt_256_bit";

    void SetUp() override {
        // Initialize spdlog for tests if not already done
        if (!spdlog::get("ecommerce_logger")) {
            test_logger = spdlog::stdout_color_mt("ecommerce_logger");
            test_logger->set_level(spdlog::level::debug);
            spdlog::set_default_logger(test_logger);
        }

        mock_db_manager_ = std::make_unique<MockDBManager>();
        auth_service_ = std::make_unique<AuthService>(*mock_db_manager_, jwt_secret_);
    }

    void TearDown() override {
        mock_db_manager_->users_.clear(); // Clear mock data after each test
    }
};

// Test registration success
TEST_F(AuthServiceTest, RegisterUserSuccessfully) {
    User user = auth_service_->register_user("testuser", "test@example.com", "password123");
    ASSERT_GT(user.id, 0);
    ASSERT_EQ(user.username, "testuser");
    ASSERT_EQ(user.email, "test@example.com");
    ASSERT_EQ(user.role, UserRole::CUSTOMER);

    std::optional<User> found_user = mock_db_manager_->find_user_by_email("test@example.com");
    ASSERT_TRUE(found_user.has_value());
    ASSERT_EQ(found_user->email, "test@example.com");
}

// Test registration with existing email
TEST_F(AuthServiceTest, RegisterUserWithExistingEmailThrowsConflict) {
    auth_service_->register_user("testuser1", "existing@example.com", "password123");
    ASSERT_THROW(auth_service_->register_user("testuser2", "existing@example.com", "anotherpass"), ConflictException);
}

// Test registration with existing username
TEST_F(AuthServiceTest, RegisterUserWithExistingUsernameThrowsConflict) {
    auth_service_->register_user("existinguser", "email1@example.com", "password123");
    ASSERT_THROW(auth_service_->register_user("existinguser", "email2@example.com", "anotherpass"), ConflictException);
}

// Test registration with weak password
TEST_F(AuthServiceTest, RegisterUserWithWeakPasswordThrowsBadRequest) {
    ASSERT_THROW(auth_service_->register_user("weakpassuser", "weak@example.com", "123"), BadRequestException);
}

// Test registration with invalid email format
TEST_F(AuthServiceTest, RegisterUserWithInvalidEmailThrowsBadRequest) {
    ASSERT_THROW(auth_service_->register_user("bademail", "bademail.com", "password123"), BadRequestException);
}


// Test login success
TEST_F(AuthServiceTest, LoginUserSuccessfully) {
    auth_service_->register_user("loginuser", "login@example.com", "correctpassword");
    auto result = auth_service_->login_user("login@example.com", "correctpassword");
    ASSERT_FALSE(result.first.empty()); // Check if token is generated
    ASSERT_EQ(result.second.email, "login@example.com");

    // Try to decode token to verify claims (requires JWTUtil to be working or mocked)
    // For this mock, we assume JWTUtil works correctly.
}

// Test login with incorrect password
TEST_F(AuthServiceTest, LoginUserWithIncorrectPasswordThrowsUnauthorized) {
    auth_service_->register_user("failuser", "fail@example.com", "correctpassword");
    ASSERT_THROW(auth_service_->login_user("fail@example.com", "wrongpassword"), UnauthorizedException);
}

// Test login with non-existent email
TEST_F(AuthServiceTest, LoginUserWithNonExistentEmailThrowsUnauthorized) {
    ASSERT_THROW(auth_service_->login_user("nonexistent@example.com", "anypassword"), UnauthorizedException);
}

// Test that admin role is correctly set and reflected
TEST_F(AuthServiceTest, AdminUserLoginReflectsAdminRole) {
    User admin_user;
    admin_user.username = "admin";
    admin_user.email = "admin@example.com";
    admin_user.password_hash = "hashed_admin_password"; // Mock the hash
    admin_user.role = UserRole::ADMIN;
    mock_db_manager_->users_["admin@example.com"] = admin_user;

    // Simulate login for this mocked admin user
    // The verify_password will fail because our mock hash isn't real.
    // For this test, we might bypass the password check or use a known hash.
    // Let's manually add a user with a hash that matches `simple_sha256_hash("adminpass")`
    admin_user.password_hash = simple_sha256_hash("adminpass");
    mock_db_manager_->users_["admin@example.com"] = admin_user;


    auto result = auth_service_->login_user("admin@example.com", "adminpass");
    ASSERT_FALSE(result.first.empty());
    ASSERT_EQ(user_role_to_string(result.second.role), "admin");
}

// Provide a simple_sha256_hash for the mock, matching auth_service.cpp
// This is duplicated from auth_service.cpp for testing purposes,
// in a real project you'd export it from a common utility.
std::string simple_sha256_hash(const std::string& str) {
    std::hash<std::string> hasher;
    size_t hash_val = hasher(str);
    std::stringstream ss;
    ss << std::hex << std::setw(64) << std::setfill('0') << hash_val;
    std::string result = ss.str();
    if (result.length() > 64) {
        return result.substr(0, 64);
    } else if (result.length() < 64) {
        return std::string(64 - result.length(), '0') + result;
    }
    return result;
}
```