#pragma once

#include <drogon/drogon.h>
#include "models/Order.h"
#include <optional>
#include <vector>

namespace repositories {

class OrderRepository {
public:
    explicit OrderRepository(drogon::orm::DbClientPtr dbClient);

    std::optional<models::Order> findById(long long id);
    std::vector<models::Order> findByUserId(long long userId);
    long long create(const models::Order& order); // Returns order ID
    bool updateStatus(long long id, const std::string& newStatus);
    bool remove(long long id);

    // Helper to add order items
    void addOrderItems(long long orderId, const std::vector<models::OrderItem>& items);

private:
    drogon::orm::DbClientPtr dbClient_;
};

} // namespace repositories