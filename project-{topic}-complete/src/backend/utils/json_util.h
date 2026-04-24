```cpp
#ifndef ECOMMERCE_JSON_UTIL_H
#define ECOMMERCE_JSON_UTIL_H

#include "crow.h"
#include <nlohmann/json.hpp>
#include "../models/user.h"
#include "../models/product.h"
#include "../models/order.h"
#include "../models/cart.h"
#include <string>
#include <vector>
#include <chrono>
#include <iomanip> // For std::put_time
#include <sstream> // For std::stringstream

// Helper to convert std::chrono::system_clock::time_point to ISO 8601 string
inline std::string to_iso8601(const std::chrono::system_clock::time_point& tp) {
    if (tp == std::chrono::system_clock::time_point{}) { // Check for default/empty time_point
        return "";
    }
    std::time_t t = std::chrono::system_clock::to_time_t(tp);
    std::tm tm = *std::gmtime(&t); // Use gmtime for UTC
    std::stringstream ss;
    ss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ"); // ISO 8601 format with Z for UTC
    return ss.str();
}

namespace JsonUtil {

    // Convert User struct to crow::json::wvalue
    crow::json::wvalue to_json(const User& user) {
        crow::json::wvalue x;
        x["id"] = user.id;
        x["username"] = user.username;
        x["email"] = user.email;
        x["role"] = user_role_to_string(user.role);
        x["created_at"] = to_iso8601(user.created_at);
        x["updated_at"] = to_iso8601(user.updated_at);
        return x;
    }

    // Convert Product struct to crow::json::wvalue
    crow::json::wvalue to_json(const Product& product) {
        crow::json::wvalue x;
        x["id"] = product.id;
        x["name"] = product.name;
        x["description"] = product.description;
        x["price"] = product.price;
        x["stock"] = product.stock;
        x["image_url"] = product.image_url;
        x["created_at"] = to_iso8601(product.created_at);
        x["updated_at"] = to_iso8601(product.updated_at);
        return x;
    }

    // Convert CartItem struct to crow::json::wvalue
    crow::json::wvalue to_json(const CartItem& item) {
        crow::json::wvalue x;
        x["id"] = item.id;
        x["product_id"] = item.product_id;
        x["name"] = item.product_name;
        x["price"] = item.product_price;
        x["quantity"] = item.quantity;
        return x;
    }

    // Convert Cart struct to crow::json::wvalue
    crow::json::wvalue to_json(const Cart& cart) {
        crow::json::wvalue x;
        x["id"] = cart.id;
        x["user_id"] = cart.user_id;
        crow::json::wvalue items_array = crow::json::wvalue::list();
        for (const auto& item : cart.items) {
            items_array.push_back(to_json(item));
        }
        x["items"] = std::move(items_array);
        x["created_at"] = to_iso8601(cart.created_at);
        x["updated_at"] = to_iso8601(cart.updated_at);
        return x;
    }

    // Convert OrderItem struct to crow::json::wvalue
    crow::json::wvalue to_json(const OrderItem& item) {
        crow::json::wvalue x;
        x["id"] = item.id;
        x["product_id"] = item.product_id;
        x["name"] = item.product_name;
        x["quantity"] = item.quantity;
        x["price"] = item.price;
        return x;
    }

    // Convert Order struct to crow::json::wvalue
    crow::json::wvalue to_json(const Order& order) {
        crow::json::wvalue x;
        x["id"] = order.id;
        x["user_id"] = order.user_id;
        x["total_amount"] = order.total_amount;
        x["status"] = order_status_to_string(order.status);
        crow::json::wvalue items_array = crow::json::wvalue::list();
        for (const auto& item : order.items) {
            items_array.push_back(to_json(item));
        }
        x["items"] = std::move(items_array);
        x["created_at"] = to_iso8601(order.created_at);
        x["updated_at"] = to_iso8601(order.updated_at);
        return x;
    }

    // Generic error response
    crow::json::wvalue to_json_error(const std::string& message, int code) {
        crow::json::wvalue x;
        x["message"] = message;
        x["code"] = code;
        return x;
    }

} // namespace JsonUtil

#endif // ECOMMERCE_JSON_UTIL_H
```