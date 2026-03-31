#include "OrderRepository.h"
#include <drogon/orm/Exception.h>
#include <spdlog/spdlog.h>
#include <numeric> // For std::accumulate

namespace repositories {

OrderRepository::OrderRepository(drogon::orm::DbClientPtr dbClient) : dbClient_(std::move(dbClient)) {
    if (!dbClient_) {
        spdlog::critical("OrderRepository initialized with null DbClientPtr!");
        throw std::runtime_error("Database client is not initialized.");
    }
}

std::optional<models::Order> OrderRepository::findById(long long id) {
    std::string order_sql = "SELECT id, user_id, order_date, total_amount, status, created_at, updated_at FROM orders WHERE id = $1";
    std::string items_sql = "SELECT id, order_id, product_id, product_name, price_at_purchase, quantity FROM order_items WHERE order_id = $1";
    try {
        auto order_result = dbClient_->execSqlSync(order_sql, id);
        if (!order_result.empty()) {
            const auto& order_row = order_result[0];
            models::Order order;
            order.id = order_row["id"].as<long long>();
            order.userId = order_row["user_id"].as<long long>();
            order.orderDate = order_row["order_date"].as<std::string>();
            order.totalAmount = order_row["total_amount"].as<double>();
            order.status = order_row["status"].as<std::string>();
            order.createdAt = order_row["created_at"].as<std::string>();
            order.updatedAt = order_row["updated_at"].as<std::string>();

            auto items_result = dbClient_->execSqlSync(items_sql, id);
            for (const auto& item_row : items_result) {
                models::OrderItem item;
                item.id = item_row["id"].as<long long>();
                item.orderId = item_row["order_id"].as<long long>();
                item.productId = item_row["product_id"].as<long long>();
                item.productName = item_row["product_name"].as<std::string>();
                item.priceAtPurchase = item_row["price_at_purchase"].as<double>();
                item.quantity = item_row["quantity"].as<int>();
                order.items.push_back(item);
            }
            return order;
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findById (Order): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findById (Order): {}", e.what());
    }
    return std::nullopt;
}

std::vector<models::Order> OrderRepository::findByUserId(long long userId) {
    std::vector<models::Order> orders;
    std::string order_sql = "SELECT id, user_id, order_date, total_amount, status, created_at, updated_at FROM orders WHERE user_id = $1 ORDER BY order_date DESC";
    std::string items_sql = "SELECT id, order_id, product_id, product_name, price_at_purchase, quantity FROM order_items WHERE order_id = $1";
    try {
        auto orders_result = dbClient_->execSqlSync(order_sql, userId);
        for (const auto& order_row : orders_result) {
            models::Order order;
            order.id = order_row["id"].as<long long>();
            order.userId = order_row["user_id"].as<long long>();
            order.orderDate = order_row["order_date"].as<std::string>();
            order.totalAmount = order_row["total_amount"].as<double>();
            order.status = order_row["status"].as<std::string>();
            order.createdAt = order_row["created_at"].as<std::string>();
            order.updatedAt = order_row["updated_at"].as<std::string>();

            auto items_result = dbClient_->execSqlSync(items_sql, order.id);
            for (const auto& item_row : items_result) {
                models::OrderItem item;
                item.id = item_row["id"].as<long long>();
                item.orderId = item_row["order_id"].as<long long>();
                item.productId = item_row["product_id"].as<long long>();
                item.productName = item_row["product_name"].as<std::string>();
                item.priceAtPurchase = item_row["price_at_purchase"].as<double>();
                item.quantity = item_row["quantity"].as<int>();
                order.items.push_back(item);
            }
            orders.push_back(order);
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findByUserId (Order): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findByUserId (Order): {}", e.what());
    }
    return orders;
}

long long OrderRepository::create(const models::Order& order) {
    std::string sql = "INSERT INTO orders (user_id, order_date, total_amount, status) VALUES ($1, NOW(), $2, $3) RETURNING id";
    try {
        auto result = dbClient_->execSqlSync(sql,
                                             order.userId,
                                             order.totalAmount,
                                             order.status);
        if (!result.empty()) {
            return result[0]["id"].as<long long>();
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in create (Order): {}", e.what());
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in create (Order): {}", e.what());
        throw;
    }
    return 0;
}

void OrderRepository::addOrderItems(long long orderId, const std::vector<models::OrderItem>& items) {
    // This could be optimized with a single multi-row insert or batch operations
    std::string sql = "INSERT INTO order_items (order_id, product_id, product_name, price_at_purchase, quantity) VALUES ($1, $2, $3, $4, $5)";
    for (const auto& item : items) {
        try {
            dbClient_->execSqlSync(sql,
                                   orderId,
                                   item.productId,
                                   item.productName,
                                   item.priceAtPurchase,
                                   item.quantity);
        } catch (const drogon::orm::DrogonDbException& e) {
            spdlog::error("DB error adding order item for order {}: {}", orderId, e.what());
            throw; // Re-throw to indicate failure for the entire order creation
        }
    }
}

bool OrderRepository::updateStatus(long long id, const std::string& newStatus) {
    std::string sql = "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2";
    try {
        size_t affectedRows = dbClient_->execSqlSync(sql, newStatus, id).affectedRows();
        return affectedRows > 0;
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in updateStatus (Order): {}", e.what());
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in updateStatus (Order): {}", e.what());
        throw;
    }
}

bool OrderRepository::remove(long long id) {
    // Note: This needs to handle cascading delete for order_items or manually delete them first
    // For simplicity, assuming CASCADE DELETE on foreign key constraint in schema.
    std::string sql = "DELETE FROM orders WHERE id = $1";
    try {
        size_t affectedRows = dbClient_->execSqlSync(sql, id).affectedRows();
        return affectedRows > 0;
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in remove (Order): {}", e.what());
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in remove (Order): {}", e.what());
        throw;
    }
}

} // namespace repositories