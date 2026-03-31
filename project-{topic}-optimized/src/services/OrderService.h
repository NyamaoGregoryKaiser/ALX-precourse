#pragma once

#include "repositories/OrderRepository.h"
#include "repositories/ProductRepository.h"
#include "models/Order.h"
#include <string>
#include <optional>
#include <vector>
#include <memory>

namespace services {

class OrderService {
public:
    OrderService(std::shared_ptr<repositories::OrderRepository> orderRepo,
                 std::shared_ptr<repositories::ProductRepository> productRepo);

    std::optional<models::Order> getOrderById(long long orderId);
    std::vector<models::Order> getOrdersByUserId(long long userId);
    long long createOrder(long long userId, const std::vector<models::OrderItem>& items);
    bool updateOrderStatus(long long orderId, const std::string& newStatus);
    bool cancelOrder(long long orderId); // Specific status update
    bool deleteOrder(long long orderId); // Admin only, or specific conditions

private:
    std::shared_ptr<repositories::OrderRepository> orderRepo_;
    std::shared_ptr<repositories::ProductRepository> productRepo_; // To manage product stock
};

} // namespace services