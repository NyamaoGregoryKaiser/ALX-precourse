```cpp
#ifndef ECOMMERCE_ORDER_H
#define ECOMMERCE_ORDER_H

#include <string>
#include <vector>
#include <chrono>

enum class OrderStatus {
    PENDING,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED
};

inline std::string order_status_to_string(OrderStatus status) {
    switch (status) {
        case OrderStatus::PENDING: return "pending";
        case OrderStatus::PROCESSING: return "processing";
        case OrderStatus::SHIPPED: return "shipped";
        case OrderStatus::DELIVERED: return "delivered";
        case OrderStatus::CANCELLED: return "cancelled";
    }
    return "unknown";
}

inline OrderStatus string_to_order_status(const std::string& status_str) {
    if (status_str == "pending") return OrderStatus::PENDING;
    if (status_str == "processing") return OrderStatus::PROCESSING;
    if (status_str == "shipped") return OrderStatus::SHIPPED;
    if (status_str == "delivered") return OrderStatus::DELIVERED;
    if (status_str == "cancelled") return OrderStatus::CANCELLED;
    return OrderStatus::PENDING; // Default
}

struct OrderItem {
    int id;
    int order_id;
    int product_id;
    std::string product_name; // To display in order details
    int quantity;
    double price; // Price at the time of order

    OrderItem() : id(0), order_id(0), product_id(0), quantity(0), price(0.0) {}
};

struct Order {
    int id;
    int user_id;
    double total_amount;
    OrderStatus status;
    std::vector<OrderItem> items;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    Order() : id(0), user_id(0), total_amount(0.0), status(OrderStatus::PENDING), created_at(), updated_at() {}
};

#endif // ECOMMERCE_ORDER_H
```