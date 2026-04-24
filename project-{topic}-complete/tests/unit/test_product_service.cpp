```cpp
#include "gtest/gtest.h"
#include "../../src/backend/services/product_service.h"
#include "../../src/backend/db/db_manager.h"
#include "../../src/backend/middleware/error_middleware.h"
#include <memory>
#include <optional>
#include <map>
#include <vector>

// Mock DBManager for ProductService unit tests
class MockProductDBManager : public DBManager {
public:
    MockProductDBManager() : DBManager("", "", "", "", "") {} // Dummy connection string

    // Mocked methods for product operations
    Product create_product(const Product& product) override {
        Product new_product = product;
        new_product.id = ++next_product_id_;
        new_product.created_at = std::chrono::system_clock::now();
        new_product.updated_at = new_product.created_at;
        products_[new_product.id] = new_product;
        // Also map by name for conflict checks
        product_names_[new_product.name] = new_product.id;
        return new_product;
    }

    std::optional<Product> get_product_by_id(int id) override {
        auto it = products_.find(id);
        if (it != products_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

    std::vector<Product> get_all_products(const std::string& search_term, int limit, int offset) override {
        std::vector<Product> results;
        int count = 0;
        for (const auto& pair : products_) {
            const Product& p = pair.second;
            if (search_term.empty() || p.name.find(search_term) != std::string::npos || p.description.find(search_term) != std::string::npos) {
                if (count >= offset && results.size() < limit) {
                    results.push_back(p);
                }
                count++;
            }
        }
        return results;
    }

    Product update_product(const Product& product) override {
        auto it = products_.find(product.id);
        if (it == products_.end()) {
            throw NotFoundException("Product not found.");
        }
        Product& existing_product = it->second;

        // Simulate updates for non-empty fields
        if (!product.name.empty()) {
            // Check for name conflict if name is being changed
            if (existing_product.name != product.name && product_names_.count(product.name)) {
                throw ConflictException("Product with this name already exists.");
            }
            // Update name in both maps
            product_names_.erase(existing_product.name);
            existing_product.name = product.name;
            product_names_[existing_product.name] = existing_product.id;
        }
        if (!product.description.empty()) existing_product.description = product.description;
        if (product.price >= 0) existing_product.price = product.price;
        if (product.stock >= 0) existing_product.stock = product.stock;
        if (!product.image_url.empty()) existing_product.image_url = product.image_url;
        existing_product.updated_at = std::chrono::system_clock::now();
        return existing_product;
    }

    void delete_product(int id) override {
        auto it = products_.find(id);
        if (it == products_.end()) {
            throw NotFoundException("Product not found.");
        }
        product_names_.erase(it->second.name); // Remove from name map
        products_.erase(it);
    }

    // Unused in Product Service, but needed to satisfy interface
    void connect() override {}
    pqxx::result exec_query(const std::string& query) override { return pqxx::result(); }
    pqxx::result exec_params(const std::string& query, const pqxx::params& params) override { return pqxx::result(); }
    pqxx::work begin_transaction() override {
        throw std::runtime_error("Transactions not supported in mock for this test.");
    }

    std::optional<User> find_user_by_email(const std::string& email) override { return std::nullopt; }
    std::optional<User> find_user_by_id(int id) override { return std::nullopt; }
    bool check_user_exists_by_email(const std::string& email) override { return false; }
    bool check_user_exists_by_username(const std::string& username) override { return false; }
    User create_user(const User& user) override { return User(); }
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
    std::map<int, Product> products_;
    std::map<std::string, int> product_names_; // For unique name check
    int next_product_id_ = 0;
};

// Global logger for tests
extern std::shared_ptr<spdlog::logger> test_logger; // Declared in test_auth_service.cpp

class ProductServiceTest : public ::testing::Test {
protected:
    std::unique_ptr<MockProductDBManager> mock_db_manager_;
    std::unique_ptr<ProductService> product_service_;

    void SetUp() override {
        if (!spdlog::get("ecommerce_logger")) {
            test_logger = spdlog::stdout_color_mt("ecommerce_logger");
            test_logger->set_level(spdlog::level::debug);
            spdlog::set_default_logger(test_logger);
        }
        mock_db_manager_ = std::make_unique<MockProductDBManager>();
        product_service_ = std::make_unique<ProductService>(*mock_db_manager_);
    }

    void TearDown() override {
        mock_db_manager_->products_.clear();
        mock_db_manager_->product_names_.clear();
        mock_db_manager_->next_product_id_ = 0;
    }

    Product create_test_product(const std::string& name, double price, int stock) {
        Product p;
        p.name = name;
        p.description = name + " description";
        p.price = price;
        p.stock = stock;
        p.image_url = "http://example.com/" + name + ".jpg";
        return product_service_->create_product(p);
    }
};

// Test Create Product
TEST_F(ProductServiceTest, CreateProductSuccessfully) {
    Product p = create_test_product("Test Product", 99.99, 100);
    ASSERT_GT(p.id, 0);
    ASSERT_EQ(p.name, "Test Product");
    ASSERT_EQ(mock_db_manager_->products_.size(), 1);
}

TEST_F(ProductServiceTest, CreateProductWithExistingNameThrowsConflict) {
    create_test_product("Duplicate Product", 10.0, 10);
    ASSERT_THROW(create_test_product("Duplicate Product", 20.0, 20), ConflictException);
}

TEST_F(ProductServiceTest, CreateProductWithInvalidPriceThrowsBadRequest) {
    Product p;
    p.name = "Invalid Price";
    p.price = -5.0;
    p.stock = 10;
    ASSERT_THROW(product_service_->create_product(p), BadRequestException);
}

// Test Get Product By ID
TEST_F(ProductServiceTest, GetProductByIdSuccessfully) {
    Product p1 = create_test_product("Product 1", 10.0, 10);
    Product found_p = product_service_->get_product_by_id(p1.id);
    ASSERT_EQ(found_p.id, p1.id);
    ASSERT_EQ(found_p.name, p1.name);
}

TEST_F(ProductServiceTest, GetProductByNonExistentIdThrowsNotFound) {
    ASSERT_THROW(product_service_->get_product_by_id(999), NotFoundException);
}

// Test Get All Products
TEST_F(ProductServiceTest, GetAllProductsReturnsAll) {
    create_test_product("A Product", 10.0, 10);
    create_test_product("B Gadget", 20.0, 20);
    std::vector<Product> products = product_service_->get_all_products("", 10, 0);
    ASSERT_EQ(products.size(), 2);
}

TEST_F(ProductServiceTest, GetAllProductsWithSearchTermFiltersCorrectly) {
    create_test_product("Laptop", 1000.0, 50);
    create_test_product("Mouse", 25.0, 200);
    create_test_product("Keyboard", 75.0, 150);
    std::vector<Product> products = product_service_->get_all_products("Mouse", 10, 0);
    ASSERT_EQ(products.size(), 1);
    ASSERT_EQ(products[0].name, "Mouse");
}

TEST_F(ProductServiceTest, GetAllProductsWithLimitAndOffset) {
    for (int i = 0; i < 5; ++i) {
        create_test_product("Item " + std::to_string(i), (double)i, i * 10);
    }
    std::vector<Product> products = product_service_->get_all_products("", 2, 1);
    ASSERT_EQ(products.size(), 2);
    // Assuming DBManager returns sorted by name, this would be Item 1, Item 2
    // If not, depends on internal order of mock_db_manager_->products_
}


// Test Update Product
TEST_F(ProductServiceTest, UpdateProductSuccessfully) {
    Product p1 = create_test_product("Old Name", 10.0, 10);
    Product update_data;
    update_data.id = p1.id;
    update_data.name = "New Name";
    update_data.price = 15.0;
    Product updated_p = product_service_->update_product(update_data);
    ASSERT_EQ(updated_p.id, p1.id);
    ASSERT_EQ(updated_p.name, "New Name");
    ASSERT_EQ(updated_p.price, 15.0);
    ASSERT_EQ(mock_db_manager_->products_[p1.id].name, "New Name"); // Verify internal state
}

TEST_F(ProductServiceTest, UpdateProductNonExistentIdThrowsNotFound) {
    Product update_data;
    update_data.id = 999;
    update_data.name = "Fake Product";
    ASSERT_THROW(product_service_->update_product(update_data), NotFoundException);
}

TEST_F(ProductServiceTest, UpdateProductWithExistingNameThrowsConflict) {
    create_test_product("Product A", 10.0, 10);
    Product p2 = create_test_product("Product B", 20.0, 20);
    Product update_data;
    update_data.id = p2.id;
    update_data.name = "Product A"; // Try to change P2's name to P1's name
    ASSERT_THROW(product_service_->update_product(update_data), ConflictException);
}

TEST_F(ProductServiceTest, UpdateProductWithInvalidPriceThrowsBadRequest) {
    Product p1 = create_test_product("Product C", 10.0, 10);
    Product update_data;
    update_data.id = p1.id;
    update_data.price = -10.0;
    ASSERT_THROW(product_service_->update_product(update_data), BadRequestException);
}


// Test Delete Product
TEST_F(ProductServiceTest, DeleteProductSuccessfully) {
    Product p1 = create_test_product("Product to Delete", 10.0, 10);
    product_service_->delete_product(p1.id);
    ASSERT_EQ(mock_db_manager_->products_.size(), 0);
    ASSERT_THROW(product_service_->get_product_by_id(p1.id), NotFoundException);
}

TEST_F(ProductServiceTest, DeleteProductNonExistentIdThrowsNotFound) {
    ASSERT_THROW(product_service_->delete_product(999), NotFoundException);
}
```