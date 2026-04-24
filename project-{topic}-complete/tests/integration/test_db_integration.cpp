```cpp
#include "gtest/gtest.h"
#include "../../src/backend/db/db_manager.h"
#include "../../src/backend/models/user.h"
#include "../../src/backend/models/product.h"
#include "../../src/backend/models/order.h"
#include "../../src/backend/models/cart.h"
#include "../../src/backend/middleware/error_middleware.h"
#include "../../src/backend/utils/env_loader.h" // To load DB config
#include <memory>
#include <chrono>
#include <spdlog/spdlog.h>
#include <fstream>
#include <iostream>

// Global logger for tests
extern std::shared_ptr<spdlog::logger> test_logger; // Declared in unit tests, or redefine here

// Fixture for DB integration tests
class DBIntegrationTest : public ::testing::Test {
protected:
    std::unique_ptr<DBManager> db_manager_;
    std::string test_db_name_ = "test_ecommerce_db";
    std::string db_host_;
    std::string db_port_;
    std::string db_user_;
    std::string db_password_;

    void SetUp() override {
        // Initialize spdlog for tests if not already done
        if (!spdlog::get("ecommerce_logger")) {
            test_logger = spdlog::stdout_color_mt("ecommerce_logger");
            test_logger->set_level(spdlog::level::debug);
            spdlog::set_default_logger(test_logger);
        }

        // Load environment variables for DB connection
        // Assuming .env is configured for test environment
        load_env("config/.env"); // Load from default path
        db_host_ = get_env("DB_HOST", "localhost");
        db_port_ = get_env("DB_PORT", "5432");
        db_name_ = get_env("DB_NAME", "ecommerce_db"); // Use a dedicated test DB name if possible
        db_user_ = get_env("DB_USER", "ecommerce_user");
        db_password_ = get_env("DB_PASSWORD", "ecommerce_password");

        // Override with test_db_name_
        test_db_name_ = "ecommerce_test_db";

        // Create a dedicated test database if it doesn't exist
        // This requires superuser privileges or a separate setup script
        std::string admin_conn_str = "host=" + db_host_ + " port=" + db_port_ + " user=" + db_user_ + " password=" + db_password_ + " dbname=postgres"; // Connect to default 'postgres' db
        try {
            pqxx::connection admin_conn(admin_conn_str);
            pqxx::work tx(admin_conn);
            std::string create_db_query = "CREATE DATABASE " + test_db_name_ + " OWNER " + db_user_ + ";";
            tx.exec("SELECT 1 FROM pg_database WHERE datname = '" + test_db_name_ + "'");
            if (tx.result().empty()) {
                tx.exec(create_db_query);
                spdlog::info("Created test database: {}", test_db_name_);
            } else {
                spdlog::info("Test database {} already exists.", test_db_name_);
            }
            tx.commit();
        } catch (const pqxx::sql_error& e) {
            // Ignore "duplicate database" error if it's already there
            if (std::string(e.sql_state()) != "42P04") { // duplicate_database
                spdlog::error("Failed to ensure test database exists (SQL error: {}): {}", e.sql_state(), e.what());
                // Rethrow only if it's not a "duplicate database" error
                throw;
            }
        } catch (const std::exception& e) {
            spdlog::error("Failed to ensure test database exists: {}", e.what());
            throw;
        }


        db_manager_ = std::make_unique<DBManager>(db_host_, db_port_, test_db_name_, db_user_, db_password_);
        db_manager_->connect();

        // Apply schema and seed data before each test
        // This ensures a clean state
        std::ifstream schema_file("db/schema.sql");
        std::string schema_sql((std::istreambuf_iterator<char>(schema_file)),
                                std::istreambuf_iterator<char>());
        db_manager_->exec_query(schema_sql); // schema.sql contains DROP TABLE IF EXISTS, so it cleans up

        std::ifstream seed_file("db/seed.sql");
        std::string seed_sql((std::istreambuf_iterator<char>(seed_file)),
                              std::istreambuf_iterator<char>());
        db_manager_->exec_query(seed_sql);
    }

    void TearDown() override {
        // Clean up or drop the test database if desired
        // For simplicity, we just clear schema at the start of next test
        // db_manager_->exec_query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
        db_manager_.reset();
    }
};

// --- User Integration Tests ---
TEST_F(DBIntegrationTest, CreateAndFindUser) {
    User new_user;
    new_user.username = "testuser_db";
    new_user.email = "test_db@example.com";
    new_user.password_hash = "hashed_password"; // Simplified hash for integration
    new_user.role = UserRole::CUSTOMER;

    User created_user = db_manager_->create_user(new_user);
    ASSERT_GT(created_user.id, 0);
    ASSERT_EQ(created_user.email, "test_db@example.com");

    std::optional<User> found_user = db_manager_->find_user_by_email("test_db@example.com");
    ASSERT_TRUE(found_user.has_value());
    ASSERT_EQ(found_user->id, created_user.id);
    ASSERT_EQ(found_user->username, "testuser_db");
    ASSERT_EQ(found_user->role, UserRole::CUSTOMER);
}

TEST_F(DBIntegrationTest, CheckUserExists) {
    User new_user;
    new_user.username = "existsuser";
    new_user.email = "exists@example.com";
    new_user.password_hash = "hashed";
    db_manager_->create_user(new_user);

    ASSERT_TRUE(db_manager_->check_user_exists_by_email("exists@example.com"));
    ASSERT_TRUE(db_manager_->check_user_exists_by_username("existsuser"));
    ASSERT_FALSE(db_manager_->check_user_exists_by_email("nonexistent@example.com"));
    ASSERT_FALSE(db_manager_->check_user_exists_by_username("nonexistentuser"));
}

TEST_F(DBIntegrationTest, CreateDuplicateUserEmailThrowsConflict) {
    User new_user;
    new_user.username = "user1";
    new_user.email = "duplicate@example.com";
    new_user.password_hash = "hashed";
    db_manager_->create_user(new_user);

    User duplicate_user;
    duplicate_user.username = "user2";
    duplicate_user.email = "duplicate@example.com"; // Same email
    duplicate_user.password_hash = "hashed";
    ASSERT_THROW(db_manager_->create_user(duplicate_user), ConflictException);
}

// --- Product Integration Tests ---
TEST_F(DBIntegrationTest, CreateAndGetProduct) {
    Product new_product;
    new_product.name = "Test Product DB";
    new_product.description = "A product for DB testing.";
    new_product.price = 199.99;
    new_product.stock = 50;
    new_product.image_url = "http://test.com/img.jpg";

    Product created_product = db_manager_->create_product(new_product);
    ASSERT_GT(created_product.id, 0);
    ASSERT_EQ(created_product.name, "Test Product DB");

    std::optional<Product> found_product = db_manager_->get_product_by_id(created_product.id);
    ASSERT_TRUE(found_product.has_value());
    ASSERT_EQ(found_product->id, created_product.id);
    ASSERT_EQ(found_product->description, "A product for DB testing.");
}

TEST_F(DBIntegrationTest, GetAllProductsWithSearch) {
    db_manager_->create_product({"p1", "Laptop A", "Description A", 1000.0, 10, "url1"});
    db_manager_->create_product({"p2", "Desktop B", "Description B", 1500.0, 5, "url2"});
    db_manager_->create_product({"p3", "Monitor C", "Description C", 300.0, 20, "url3"});

    std::vector<Product> all_products = db_manager_->get_all_products("", 10, 0);
    ASSERT_EQ(all_products.size(), 8); // 5 from seed + 3 new ones

    std::vector<Product> search_results = db_manager_->get_all_products("Laptop", 10, 0);
    ASSERT_EQ(search_results.size(), 2); // "Laptop Pro X" from seed and "Laptop A"
}

TEST_F(DBIntegrationTest, UpdateProduct) {
    Product new_product;
    new_product.name = "Product to Update";
    new_product.description = "Old description";
    new_product.price = 100.0;
    new_product.stock = 10;
    Product created_product = db_manager_->create_product(new_product);

    Product update_data;
    update_data.id = created_product.id;
    update_data.description = "New description";
    update_data.price = 120.0;
    Product updated_product = db_manager_->update_product(update_data);

    ASSERT_EQ(updated_product.id, created_product.id);
    ASSERT_EQ(updated_product.description, "New description");
    ASSERT_EQ(updated_product.price, 120.0);
    ASSERT_TRUE(updated_product.updated_at > updated_product.created_at);
}

TEST_F(DBIntegrationTest, DeleteProduct) {
    Product new_product;
    new_product.name = "Product to Delete";
    new_product.description = "Will be gone";
    new_product.price = 50.0;
    new_product.stock = 5;
    Product created_product = db_manager_->create_product(new_product);

    db_manager_->delete_product(created_product.id);
    ASSERT_THROW(db_manager_->get_product_by_id(created_product.id), NotFoundException);
}

// --- Cart Integration Tests ---
TEST_F(DBIntegrationTest, GetOrCreateCart) {
    User user;
    user.username = "cartuser";
    user.email = "cart@example.com";
    user.password_hash = "hash";
    User created_user = db_manager_->create_user(user);

    Cart cart = db_manager_->get_or_create_user_cart(created_user.id);
    ASSERT_GT(cart.id, 0);
    ASSERT_EQ(cart.user_id, created_user.id);

    // Calling again should return the same cart
    Cart same_cart = db_manager_->get_or_create_user_cart(created_user.id);
    ASSERT_EQ(cart.id, same_cart.id);
}

TEST_F(DBIntegrationTest, AddUpdateRemoveCartItem) {
    User user;
    user.username = "cartitemuser";
    user.email = "cartitem@example.com";
    user.password_hash = "hash";
    User created_user = db_manager_->create_user(user);

    Product product1;
    product1.name = "Item 1"; product1.price = 10.0; product1.stock = 10;
    Product created_product1 = db_manager_->create_product(product1);

    Product product2;
    product2.name = "Item 2"; product2.price = 20.0; product2.stock = 5;
    Product created_product2 = db_manager_->create_product(product2);

    Cart cart = db_manager_->get_or_create_user_cart(created_user.id);

    // Add item 1
    db_manager_->add_or_update_cart_item(cart.id, created_product1.id, 2);
    std::optional<Cart> updated_cart_opt = db_manager_->get_user_cart_with_items(created_user.id);
    ASSERT_TRUE(updated_cart_opt.has_value());
    ASSERT_EQ(updated_cart_opt->items.size(), 1);
    ASSERT_EQ(updated_cart_opt->items[0].product_id, created_product1.id);
    ASSERT_EQ(updated_cart_opt->items[0].quantity, 2);

    // Add item 2
    db_manager_->add_or_update_cart_item(cart.id, created_product2.id, 1);
    updated_cart_opt = db_manager_->get_user_cart_with_items(created_user.id);
    ASSERT_TRUE(updated_cart_opt.has_value());
    ASSERT_EQ(updated_cart_opt->items.size(), 2);

    // Update item 1 quantity
    std::string update_qty_query = "UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3;";
    pqxx::work tx_update = db_manager_->begin_transaction();
    tx_update.exec_params(update_qty_query, pqxx::placeholders(3, cart.id, created_product1.id));
    tx_update.commit();

    updated_cart_opt = db_manager_->get_user_cart_with_items(created_user.id);
    ASSERT_TRUE(updated_cart_opt.has_value());
    ASSERT_EQ(updated_cart_opt->items.size(), 2);
    // Find item1 in updated cart
    auto it = std::find_if(updated_cart_opt->items.begin(), updated_cart_opt->items.end(),
                           [&](const CartItem& item){ return item.product_