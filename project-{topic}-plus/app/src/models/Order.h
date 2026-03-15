#ifndef ORDER_H
#define ORDER_H

#include <string>
#include <ctime>
#include <vector>
#include <crow.h>
#include <optional>

// Represents an item within an order
struct OrderItem {
    long long id;
    long long order_id;
    long long product_id;
    int quantity;
    double price_at_order; // Price of the product when the order was placed

    OrderItem() : id(0), order_id(0), product_id(0), quantity(0), price_at_order(0.0) {}

    OrderItem(long long id, long long order_id, long long product_id,
              int quantity, double price_at_order)
        : id(id), order_id(order_id), product_id(product_id), quantity(quantity),
          price_at_order(price_at_order) {}

    crow::json::wvalue to_json() const {
        crow::json::wvalue json_obj;
        json_obj["id"] = id;
        json_obj["order_id"] = order_id;
        json_obj["product_id"] = product_id;
        json_obj["quantity"] = quantity;
        json_obj["price_at_order"] = price_at_order;
        return json_obj;
    }
};


class Order {
public:
    long long id;
    long long user_id;
    std::string order_date;
    double total_amount;
    std::string status; // e.g., PENDING, COMPLETED, CANCELLED
    std::string created_at;
    std::string updated_at;
    std::vector<OrderItem> items; // Associated order items

    Order() : id(0), user_id(0), total_amount(0.0) {}

    Order(long long id, long long user_id, const std::string& order_date,
          double total_amount, const std::string& status,
          const std::string& created_at, const std::string& updated_at)
        : id(id), user_id(user_id), order_date(order_date), total_amount(total_amount),
          status(status), created_at(created_at), updated_at(updated_at) {}

    // Constructor for new orders (without ID and items)
    Order(long long user_id, double total_amount, const std::string& status = "PENDING")
        : id(0), user_id(user_id), total_amount(total_amount), status(status) {
        time_t rawtime;
        struct tm *timeinfo;
        char buffer[80];

        time(&rawtime);
        timeinfo = gmtime(&rawtime);
        strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
        order_date = buffer;
        created_at = buffer;
        updated_at = buffer;
    }

    crow::json::wvalue to_json() const {
        crow::json::wvalue json_obj;
        json_obj["id"] = id;
        json_obj["user_id"] = user_id;
        json_obj["order_date"] = order_date;
        json_obj["total_amount"] = total_amount;
        json_obj["status"] = status;
        json_obj["created_at"] = created_at;
        json_obj["updated_at"] = updated_at;

        crow::json::wvalue json_items = crow::json::wvalue::list();
        for (const auto& item : items) {
            json_items.add(item.to_json());
        }
        json_obj["items"] = std::move(json_items);

        return json_obj;
    }

    // Factory method to create Order from JSON
    static std::optional<Order> from_json(const crow::json::rvalue& json, long long user_id) {
        // For creation, we expect items to calculate total_amount, or total_amount directly.
        // Assuming client provides total_amount for simplicity here, but a service would calculate it.
        if (!json.has("total_amount")) {
            return std::nullopt;
        }

        Order order;
        order.user_id = user_id;
        order.total_amount = json["total_amount"].d();
        order.status = json.has("status") ? json["status"].s() : "PENDING";

        if (order.total_amount < 0) {
            return std::nullopt;
        }

        // Parse order items if present
        if (json.has("items") && json["items"].is_array()) {
            for (const auto& item_json : json["items"]) {
                if (!item_json.has("product_id") || !item_json.has("quantity") || !item_json.has("price_at_order")) {
                    return std::nullopt; // Malformed item
                }
                OrderItem item;
                item.product_id = item_json["product_id"].i();
                item.quantity = static_cast<int>(item_json["quantity"].i());
                item.price_at_order = item_json["price_at_order"].d();

                if (item.product_id <= 0 || item.quantity <= 0 || item.price_at_order < 0) {
                    return std::nullopt; // Invalid item data
                }
                order.items.push_back(item);
            }
        }
        return order;
    }
};

#endif // ORDER_H