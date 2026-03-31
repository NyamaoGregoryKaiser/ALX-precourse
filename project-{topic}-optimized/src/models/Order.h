#pragma once

#include <string>
#include <vector>
#include <json/json.h>
#include "Product.h" // For OrderItem

namespace models {

struct OrderItem {
    long long id = 0;
    long long orderId = 0;
    long long productId = 0;
    std::string productName; // Denormalized for simpler display
    double priceAtPurchase = 0.0;
    int quantity = 0;

    Json::Value toJson() const {
        Json::Value itemJson;
        itemJson["id"] = id;
        itemJson["order_id"] = orderId;
        itemJson["product_id"] = productId;
        itemJson["product_name"] = productName;
        itemJson["price_at_purchase"] = priceAtPurchase;
        itemJson["quantity"] = quantity;
        return itemJson;
    }

    static OrderItem fromJson(const Json::Value& json) {
        OrderItem item;
        if (json.isMember("id") && json["id"].isInt64()) item.id = json["id"].asInt64();
        if (json.isMember("order_id") && json["order_id"].isInt64()) item.orderId = json["order_id"].asInt64();
        if (json.isMember("product_id") && json["product_id"].isInt64()) item.productId = json["product_id"].asInt64();
        if (json.isMember("product_name") && json["product_name"].isString()) item.productName = json["product_name"].asString();
        if (json.isMember("price_at_purchase") && json["price_at_purchase"].isDouble()) item.priceAtPurchase = json["price_at_purchase"].asDouble();
        if (json.isMember("quantity") && json["quantity"].isInt()) item.quantity = json["quantity"].asInt();
        return item;
    }
};

struct Order {
    long long id = 0;
    long long userId = 0;
    std::string orderDate;
    double totalAmount = 0.0;
    std::string status; // e.g., "pending", "processed", "shipped", "delivered", "cancelled"
    std::string createdAt;
    std::string updatedAt;
    std::vector<OrderItem> items; // Nested items

    Json::Value toJson() const {
        Json::Value orderJson;
        orderJson["id"] = id;
        orderJson["user_id"] = userId;
        orderJson["order_date"] = orderDate;
        orderJson["total_amount"] = totalAmount;
        orderJson["status"] = status;
        orderJson["created_at"] = createdAt;
        orderJson["updated_at"] = updatedAt;

        Json::Value itemsJsonArray;
        for (const auto& item : items) {
            itemsJsonArray.append(item.toJson());
        }
        orderJson["items"] = itemsJsonArray;
        return orderJson;
    }

    static Order fromJson(const Json::Value& json) {
        Order order;
        if (json.isMember("id") && json["id"].isInt64()) order.id = json["id"].asInt64();
        if (json.isMember("user_id") && json["user_id"].isInt64()) order.userId = json["user_id"].asInt64();
        if (json.isMember("order_date") && json["order_date"].isString()) order.orderDate = json["order_date"].asString();
        if (json.isMember("total_amount") && json["total_amount"].isDouble()) order.totalAmount = json["total_amount"].asDouble();
        if (json.isMember("status") && json["status"].isString()) order.status = json["status"].asString();
        if (json.isMember("created_at") && json["created_at"].isString()) order.createdAt = json["created_at"].asString();
        if (json.isMember("updated_at") && json["updated_at"].isString()) order.updatedAt = json["updated_at"].asString();

        if (json.isMember("items") && json["items"].isArray()) {
            for (const auto& itemJson : json["items"]) {
                order.items.push_back(OrderItem::fromJson(itemJson));
            }
        }
        return order;
    }
};

} // namespace models