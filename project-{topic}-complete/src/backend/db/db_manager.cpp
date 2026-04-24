```cpp
#include "db_manager.h"
#include <sstream>
#include <iomanip> // For std::put_time

DBManager::DBManager(const std::string& host, const std::string& port, const std::string& dbname, const std::string& user, const std::string& password) {
    std::stringstream ss;
    ss << "host=" << host << " port=" << port << " dbname=" << dbname << " user=" << user << " password=" << password;
    conn_str_ = ss.str();
}

DBManager::~DBManager() {
    if (conn_ && conn_->is_open()) {
        conn_->disconnect();
        spdlog::info("Database disconnected.");
    }
}

void DBManager::connect() {
    try {
        conn_ = std::make_unique<pqxx::connection>(conn_str_);
        if (!conn_->is_open()) {
            throw std::runtime_error("Failed to open database connection.");
        }
    } catch (const pqxx::broken_connection& e) {
        spdlog::error("Database connection broken: {}", e.what());
        throw DBConnectionException("Database connection broken: " + std::string(e.what()));
    } catch (const std::exception& e) {
        spdlog::error("Database connection error: {}", e.what());
        throw DBConnectionException("Database connection error: " + std::string(e.what()));
    }
}

pqxx::result DBManager::exec_query(const std::string& query) {
    if (!conn_ || !conn_->is_open()) {
        throw DBConnectionException("Database connection is not open.");
    }
    try {
        pqxx::work tx(*conn_);
        pqxx::result r = tx.exec(query);
        tx.commit();
        return r;
    } catch (const pqxx::sql_error& e) {
        spdlog::error("SQL error in exec_query: {} (Query: {})", e.what(), query);
        throw DBSQLException("SQL error: " + std::string(e.what()));
    } catch (const std::exception& e) {
        spdlog::error("DB error in exec_query: {} (Query: {})", e.what(), query);
        throw DBGenericException("Database error: " + std::string(e.what()));
    }
}

pqxx::result DBManager::exec_params(const std::string& query, const pqxx::params& params) {
    if (!conn_ || !conn_->is_open()) {
        throw DBConnectionException("Database connection is not open.");
    }
    try {
        pqxx::work tx(*conn_);
        pqxx::result r = tx.exec_params(query, params);
        tx.commit();
        return r;
    } catch (const pqxx::sql_error& e) {
        spdlog::error("SQL error in exec_params: {} (Query: {})", e.what(), query);
        // Check for specific error codes if needed, e.g., unique constraint violation
        if (e.sql_state() == "23505") { // unique_violation
            throw ConflictException("A record with this unique value already exists.");
        }
        throw DBSQLException("SQL error: " + std::string(e.what()));
    } catch (const std::exception& e) {
        spdlog::error("DB error in exec_params: {} (Query: {})", e.what(), query);
        throw DBGenericException("Database error: " + std::string(e.what()));
    }
}

pqxx::work DBManager::begin_transaction() {
    if (!conn_ || !conn_->is_open()) {
        throw DBConnectionException("Database connection is not open for transaction.");
    }
    return pqxx::work(*conn_);
}

// --- User Operations ---
User DBManager::create_user(const User& user) {
    std::string query = "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, created_at, updated_at;";
    pqxx::result r = exec_params(query, pqxx::placeholders(user.username, user.email, user.password_hash, user_role_to_string(user.role)));

    if (r.empty()) {
        throw DBGenericException("Failed to create user.");
    }
    User new_user = user;
    new_user.id = r[0][0].as<int>();
    new_user.created_at = to_time_point(r[0][1]);
    new_user.updated_at = to_time_point(r[0][2]);
    return new_user;
}

std::optional<User> DBManager::find_user_by_email(const std::string& email) {
    std::string query = "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(email));

    if (r.empty()) {
        return std::nullopt;
    }

    User user;
    user.id = r[0][0].as<int>();
    user.username = to_string(r[0][1]);
    user.email = to_string(r[0][2]);
    user.password_hash = to_string(r[0][3]);
    user.role = string_to_user_role(to_string(r[0][4]));
    user.created_at = to_time_point(r[0][5]);
    user.updated_at = to_time_point(r[0][6]);
    return user;
}

std::optional<User> DBManager::find_user_by_id(int id) {
    std::string query = "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(id));

    if (r.empty()) {
        return std::nullopt;
    }

    User user;
    user.id = r[0][0].as<int>();
    user.username = to_string(r[0][1]);
    user.email = to_string(r[0][2]);
    user.password_hash = to_string(r[0][3]);
    user.role = string_to_user_role(to_string(r[0][4]));
    user.created_at = to_time_point(r[0][5]);
    user.updated_at = to_time_point(r[0][6]);
    return user;
}

bool DBManager::check_user_exists_by_email(const std::string& email) {
    std::string query = "SELECT COUNT(*) FROM users WHERE email = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(email));
    return r[0][0].as<long>() > 0;
}

bool DBManager::check_user_exists_by_username(const std::string& username) {
    std::string query = "SELECT COUNT(*) FROM users WHERE username = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(username));
    return r[0][0].as<long>() > 0;
}

// --- Product Operations ---
Product DBManager::create_product(const Product& product) {
    std::string query = "INSERT INTO products (name, description, price, stock, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at;";
    pqxx::result r = exec_params(query, pqxx::placeholders(product.name, product.description, product.price, product.stock, product.image_url));

    if (r.empty()) {
        throw DBGenericException("Failed to create product.");
    }
    Product new_product = product;
    new_product.id = r[0][0].as<int>();
    new_product.created_at = to_time_point(r[0][1]);
    new_product.updated_at = to_time_point(r[0][2]);
    return new_product;
}

std::optional<Product> DBManager::get_product_by_id(int id) {
    std::string query = "SELECT id, name, description, price, stock, image_url, created_at, updated_at FROM products WHERE id = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(id));

    if (r.empty()) {
        return std::nullopt;
    }

    Product product;
    product.id = r[0][0].as<int>();
    product.name = to_string(r[0][1]);
    product.description = to_string(r[0][2]);
    product.price = to_double(r[0][3]);
    product.stock = to_int(r[0][4]);
    product.image_url = to_string(r[0][5]);
    product.created_at = to_time_point(r[0][6]);
    product.updated_at = to_time_point(r[0][7]);
    return product;
}

std::vector<Product> DBManager::get_all_products(const std::string& search_term, int limit, int offset) {
    std::vector<Product> products;
    std::string query = "SELECT id, name, description, price, stock, image_url, created_at, updated_at FROM products ";
    std::vector<std::string> params_vec;
    int param_idx = 1;

    if (!search_term.empty()) {
        query += "WHERE name ILIKE $" + std::to_string(param_idx++) + " OR description ILIKE $" + std::to_string(param_idx++) + " ";
        params_vec.push_back("%" + search_term + "%");
        params_vec.push_back("%" + search_term + "%");
    }

    query += "ORDER BY name LIMIT $" + std::to_string(param_idx++) + " OFFSET $" + std::to_string(param_idx++) + ";";

    pqxx::result r;
    if (params_vec.empty()) {
        r = exec_params(query, pqxx::placeholders(limit, offset));
    } else {
        params_vec.push_back(std::to_string(limit));
        params_vec.push_back(std::to_string(offset));
        r = exec_params(query, pqxx::params(params_vec.begin(), params_vec.end()));
    }

    for (const auto& row : r) {
        Product product;
        product.id = row[0].as<int>();
        product.name = to_string(row[1]);
        product.description = to_string(row[2]);
        product.price = to_double(row[3]);
        product.stock = to_int(row[4]);
        product.image_url = to_string(row[5]);
        product.created_at = to_time_point(row[6]);
        product.updated_at = to_time_point(row[7]);
        products.push_back(product);
    }
    return products;
}

Product DBManager::update_product(const Product& product) {
    std::string query_base = "UPDATE products SET updated_at = CURRENT_TIMESTAMP ";
    std::vector<std::string> set_clauses;
    std::vector<std::string> params_vec;
    int param_idx = 1;

    if (!product.name.empty()) {
        set_clauses.push_back("name = $" + std::to_string(param_idx++));
        params_vec.push_back(product.name);
    }
    if (!product.description.empty()) {
        set_clauses.push_back("description = $" + std::to_string(param_idx++));
        params_vec.push_back(product.description);
    }
    if (product.price >= 0) { // Assuming price can be 0, but not negative
        set_clauses.push_back("price = $" + std::to_string(param_idx++));
        params_vec.push_back(std::to_string(product.price));
    }
    if (product.stock >= 0) { // Assuming stock can be 0, but not negative
        set_clauses.push_back("stock = $" + std::to_string(param_idx++));
        params_vec.push_back(std::to_string(product.stock));
    }
    if (!product.image_url.empty()) {
        set_clauses.push_back("image_url = $" + std::to_string(param_idx++));
        params_vec.push_back(product.image_url);
    }

    if (set_clauses.empty()) {
        throw BadRequestException("No update fields provided for product.");
    }

    std::string set_string;
    for (size_t i = 0; i < set_clauses.size(); ++i) {
        set_string += set_clauses[i];
        if (i < set_clauses.size() - 1) {
            set_string += ", ";
        }
    }

    std::string query = query_base + ", " + set_string + " WHERE id = $" + std::to_string(param_idx++) + " RETURNING id, name, description, price, stock, image_url, created_at, updated_at;";
    params_vec.push_back(std::to_string(product.id));

    pqxx::result r = exec_params(query, pqxx::params(params_vec.begin(), params_vec.end()));

    if (r.empty()) {
        throw NotFoundException("Product with ID " + std::to_string(product.id) + " not found.");
    }
    Product updated_p;
    updated_p.id = r[0][0].as<int>();
    updated_p.name = to_string(r[0][1]);
    updated_p.description = to_string(r[0][2]);
    updated_p.price = to_double(r[0][3]);
    updated_p.stock = to_int(r[0][4]);
    updated_p.image_url = to_string(r[0][5]);
    updated_p.created_at = to_time_point(r[0][6]);
    updated_p.updated_at = to_time_point(r[0][7]);
    return updated_p;
}

void DBManager::delete_product(int id) {
    std::string query = "DELETE FROM products WHERE id = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(id));
    if (r.affected_rows() == 0) {
        throw NotFoundException("Product with ID " + std::to_string(id) + " not found.");
    }
}

void DBManager::decrease_product_stock(int product_id, int quantity, pqxx::work& tx) {
    std::string query = "UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND stock >= $1;";
    pqxx::result r = tx.exec_params(query, pqxx::placeholders(quantity, product_id));
    if (r.affected_rows() == 0) {
        throw BadRequestException("Insufficient stock for product ID: " + std::to_string(product_id));
    }
}

void DBManager::increase_product_stock(int product_id, int quantity, pqxx::work& tx) {
    std::string query = "UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;";
    tx.exec_params(query, pqxx::placeholders(quantity, product_id));
}


// --- Cart Operations ---
Cart DBManager::get_or_create_user_cart(int user_id) {
    std::string query = "SELECT id, created_at, updated_at FROM carts WHERE user_id = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(user_id));

    if (!r.empty()) {
        Cart cart;
        cart.id = r[0][0].as<int>();
        cart.user_id = user_id;
        cart.created_at = to_time_point(r[0][1]);
        cart.updated_at = to_time_point(r[0][2]);
        return cart;
    } else {
        std::string create_query = "INSERT INTO carts (user_id) VALUES ($1) RETURNING id, created_at, updated_at;";
        pqxx::result create_r = exec_params(create_query, pqxx::placeholders(user_id));
        if (create_r.empty()) {
            throw DBGenericException("Failed to create cart for user " + std::to_string(user_id));
        }
        Cart new_cart;
        new_cart.id = create_r[0][0].as<int>();
        new_cart.user_id = user_id;
        new_cart.created_at = to_time_point(create_r[0][1]);
        new_cart.updated_at = to_time_point(create_r[0][2]);
        return new_cart;
    }
}

std::optional<Cart> DBManager::get_user_cart_with_items(int user_id) {
    std::string query = R"(
        SELECT
            c.id AS cart_id,
            c.user_id,
            c.created_at,
            c.updated_at,
            ci.id AS cart_item_id,
            ci.product_id,
            p.name AS product_name,
            p.price AS product_price,
            ci.quantity
        FROM carts c
        LEFT JOIN cart_items ci ON c.id = ci.cart_id
        LEFT JOIN products p ON ci.product_id = p.id
        WHERE c.user_id = $1;
    )";
    pqxx::result r = exec_params(query, pqxx::placeholders(user_id));

    if (r.empty()) {
        return std::nullopt; // No cart found for user
    }

    Cart cart;
    cart.id = r[0]["cart_id"].as<int>();
    cart.user_id = r[0]["user_id"].as<int>();
    cart.created_at = to_time_point(r[0]["created_at"]);
    cart.updated_at = to_time_point(r[0]["updated_at"]);

    for (const auto& row : r) {
        if (!row["cart_item_id"].is_null()) {
            CartItem item;
            item.id = row["cart_item_id"].as<int>();
            item.cart_id = row["cart_id"].as<int>();
            item.product_id = row["product_id"].as<int>();
            item.product_name = to_string(row["product_name"]);
            item.product_price = to_double(row["product_price"]);
            item.quantity = row["quantity"].as<int>();
            cart.items.push_back(item);
        }
    }
    return cart;
}

CartItem DBManager::add_or_update_cart_item(int cart_id, int product_id, int quantity) {
    std::string query = R"(
        INSERT INTO cart_items (cart_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (cart_id, product_id) DO UPDATE
        SET quantity = cart_items.quantity + EXCLUDED.quantity
        RETURNING id, cart_id, product_id, quantity;
    )";
    pqxx::result r = exec_params(query, pqxx::placeholders(cart_id, product_id, quantity));

    if (r.empty()) {
        throw DBGenericException("Failed to add or update cart item.");
    }

    CartItem item;
    item.id = r[0][0].as<int>();
    item.cart_id = r[0][1].as<int>();
    item.product_id = r[0][2].as<int>();
    item.quantity = r[0][3].as<int>();
    return item;
}

void DBManager::remove_cart_item(int cart_id, int product_id) {
    std::string query = "DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2;";
    pqxx::result r = exec_params(query, pqxx::placeholders(cart_id, product_id));
    if (r.affected_rows() == 0) {
        throw NotFoundException("Cart item for product ID " + std::to_string(product_id) + " not found in cart " + std::to_string(cart_id));
    }
}

void DBManager::clear_cart_items(int cart_id, pqxx::work& tx) {
    std::string query = "DELETE FROM cart_items WHERE cart_id = $1;";
    tx.exec_params(query, pqxx::placeholders(cart_id));
}

// --- Order Operations ---
Order DBManager::create_order(int user_id, double total_amount, OrderStatus status, pqxx::work& tx) {
    std::string query = "INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at;";
    pqxx::result r = tx.exec_params(query, pqxx::placeholders(user_id, total_amount, order_status_to_string(status)));

    if (r.empty()) {
        throw DBGenericException("Failed to create order.");
    }
    Order order;
    order.id = r[0][0].as<int>();
    order.user_id = user_id;
    order.total_amount = total_amount;
    order.status = status;
    order.created_at = to_time_point(r[0][1]);
    order.updated_at = to_time_point(r[0][2]);
    return order;
}

void DBManager::create_order_item(int order_id, int product_id, int quantity, double price, pqxx::work& tx) {
    std::string query = "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4);";
    tx.exec_params(query, pqxx::placeholders(order_id, product_id, quantity, price));
}

std::vector<Order> DBManager::get_user_orders(int user_id) {
    std::vector<Order> orders;
    std::string query = "SELECT id, user_id, total_amount, status, created_at, updated_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC;";
    pqxx::result r = exec_params(query, pqxx::placeholders(user_id));

    for (const auto& row : r) {
        Order order;
        order.id = row[0].as<int>();
        order.user_id = row[1].as<int>();
        order.total_amount = to_double(row[2]);
        order.status = string_to_order_status(to_string(row[3]));
        order.created_at = to_time_point(row[4]);
        order.updated_at = to_time_point(row[5]);
        orders.push_back(order);
    }
    return orders;
}

std::optional<Order> DBManager::get_order_by_id(int order_id) {
    std::string query = "SELECT id, user_id, total_amount, status, created_at, updated_at FROM orders WHERE id = $1;";
    pqxx::result r = exec_params(query, pqxx::placeholders(order_id));

    if (r.empty()) {
        return std::nullopt;
    }

    Order order;
    order.id = r[0][0].as<int>();
    order.user_id = r[0][1].as<int>();
    order.total_amount = to_double(r[0][2]);
    order.status = string_to_order_status(to_string(r[0][3]));
    order.created_at = to_time_point(r[0][4]);
    order.updated_at = to_time_point(r[0][5]);
    order.items = get_order_items(order_id); // Load associated items
    return order;
}

std::vector<OrderItem> DBManager::get_order_items(int order_id) {
    std::vector<OrderItem> items;
    std::string query = R"(
        SELECT oi.id, oi.order_id, oi.product_id, p.name AS product_name, oi.quantity, oi.price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1;
    )";
    pqxx::result r = exec_params(query, pqxx::placeholders(order_id));

    for (const auto& row : r) {
        OrderItem item;
        item.id = row[0].as<int>();
        item.order_id = row[1].as<int>();
        item.product_id = row[2].as<int>();
        item.product_name = to_string(row[3]);
        item.quantity = to_int(row[4]);
        item.price = to_double(row[5]);
        items.push_back(item);
    }
    return items;
}
```