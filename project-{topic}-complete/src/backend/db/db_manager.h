```cpp
#ifndef ECOMMERCE_DB_MANAGER_H
#define ECOMMERCE_DB_MANAGER_H

#include <string>
#include <memory>
#include <vector>
#include <pqxx/pqxx>
#include <spdlog/spdlog.h>
#include "../models/user.h"
#include "../models/product.h"
#include "../models/order.h"
#include "../models/cart.h"
#include "../middleware/error_middleware.h" // For custom exceptions
#include <chrono>

// Helper to convert pqxx::result::field to std::string
inline std::string to_string(const pqxx::field& f) {
    return f.is_null() ? "" : f.as<std::string>();
}

// Helper to convert pqxx::result::field to double
inline double to_double(const pqxx::field& f) {
    return f.is_null() ? 0.0 : f.as<double>();
}

// Helper to convert pqxx::result::field to int
inline int to_int(const pqxx::field& f) {
    return f.is_null() ? 0 : f.as<int>();
}

// Helper to convert pqxx::result::field to std::chrono::system_clock::time_point
inline std::chrono::system_clock::time_point to_time_point(const pqxx::field& f) {
    if (f.is_null()) {
        return std::chrono::system_clock::time_point{};
    }
    // Parse timestamp with time zone (e.g., '2023-10-27 10:00:00+00')
    std::string ts_str = f.as<std::string>();
    std::tm t = {};
    std::istringstream ss(ts_str);
    ss >> std::get_time(&t, "%Y-%m-%d %H:%M:%S");

    // Handle timezone offset (simplified: assume UTC if '+00' or similar)
    // For full timezone support, std::chrono::parse is better but C++20.
    // For now, if string ends with +HH or -HH, you might adjust.
    // Crow's JSON and C++chrono typically work with UTC or local without explicit tz parsing here.
    // For pqxx and C++, generally treat DB timestamps as UTC or convert to UTC.
    // Assuming DB stores in UTC or we just take raw value for demo.

    return std::chrono::system_clock::from_time_t(std::mktime(&t));
}


class DBManager {
private:
    std::string conn_str_;
    std::unique_ptr<pqxx::connection> conn_;

public:
    DBManager(const std::string& host, const std::string& port, const std::string& dbname, const std::string& user, const std::string& password);
    ~DBManager();

    void connect();
    pqxx::result exec_query(const std::string& query);
    pqxx::result exec_params(const std::string& query, const pqxx::params& params = {});
    pqxx::work begin_transaction();

    // --- User Operations ---
    User create_user(const User& user);
    std::optional<User> find_user_by_email(const std::string& email);
    std::optional<User> find_user_by_id(int id);
    bool check_user_exists_by_email(const std::string& email);
    bool check_user_exists_by_username(const std::string& username);

    // --- Product Operations ---
    Product create_product(const Product& product);
    std::optional<Product> get_product_by_id(int id);
    std::vector<Product> get_all_products(const std::string& search_term, int limit, int offset);
    Product update_product(const Product& product);
    void delete_product(int id);
    void decrease_product_stock(int product_id, int quantity, pqxx::work& tx);
    void increase_product_stock(int product_id, int quantity, pqxx::work& tx);


    // --- Cart Operations ---
    Cart get_or_create_user_cart(int user_id);
    std::optional<Cart> get_user_cart_with_items(int user_id);
    CartItem add_or_update_cart_item(int cart_id, int product_id, int quantity);
    void remove_cart_item(int cart_id, int product_id);
    void clear_cart_items(int cart_id, pqxx::work& tx);


    // --- Order Operations ---
    Order create_order(int user_id, double total_amount, OrderStatus status, pqxx::work& tx);
    void create_order_item(int order_id, int product_id, int quantity, double price, pqxx::work& tx);
    std::vector<Order> get_user_orders(int user_id);
    std::optional<Order> get_order_by_id(int order_id);
    std::vector<OrderItem> get_order_items(int order_id);
};

#endif // ECOMMERCE_DB_MANAGER_H
```