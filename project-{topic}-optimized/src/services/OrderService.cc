#include "OrderService.h"
#include "middleware/ErrorHandler.h"
#include <spdlog/spdlog.h>
#include <numeric> // For std::accumulate

namespace services {

OrderService::OrderService(std::shared_ptr<repositories::OrderRepository> orderRepo,
                           std::shared_ptr<repositories::ProductRepository> productRepo)
    : orderRepo_(std::move(orderRepo)), productRepo_(std::move(productRepo)) {
    if (!orderRepo_) {
        spdlog::critical("OrderService initialized with null OrderRepository!");
        throw std::runtime_error("OrderRepository is not initialized.");
    }
    if (!productRepo_) {
        spdlog::critical("OrderService initialized with null ProductRepository!");
        throw std::runtime_error("ProductRepository is not initialized.");
    }
}

std::optional<models::Order> OrderService::getOrderById(long long orderId) {
    auto order = orderRepo_->findById(orderId);
    if (!order) {
        spdlog::warn("Order ID {} not found.", orderId);
    }
    return order;
}

std::vector<models::Order> OrderService::getOrdersByUserId(long long userId) {
    return orderRepo_->findByUserId(userId);
}

long long OrderService::createOrder(long long userId, const std::vector<models::OrderItem>& items) {
    if (items.empty()) {
        throw BadRequestError("Cannot create an order with no items.");
    }

    double totalAmount = 0.0;
    std::vector<std::pair<long long, int>> stockChanges; // productId, quantity

    // Validate products and calculate total amount
    for (const auto& item : items) {
        if (item.productId <= 0 || item.quantity <= 0) {
            throw BadRequestError("Invalid product ID or quantity in order items.");
        }
        auto product = productRepo_->findById(item.productId);
        if (!product) {
            throw NotFoundError("Product with ID " + std::to_string(item.productId) + " not found.");
        }
        if (product->stockQuantity < item.quantity) {
            throw BadRequestError("Insufficient stock for product '" + product->name + "' (ID: " + std::to_string(item.productId) + "). Available: " + std::to_string(product->stockQuantity) + ", Requested: " + std::to_string(item.quantity));
        }
        totalAmount += product->price * item.quantity;
        stockChanges.emplace_back(item.productId, item.quantity);
    }

    models::Order newOrder;
    newOrder.userId = userId;
    newOrder.totalAmount = totalAmount;
    newOrder.status = "pending"; // Initial status
    newOrder.items = items; // Store items for repository to save

    // Perform transaction for order creation and stock update
    try {
        // Start a transaction (Drogon's DbClient doesn't directly expose transaction objects in sync mode,
        // but typically operations would be async for real transactions, or a custom wrapper used)
        // For sync calls, we simulate atomicity by rolling back manually if subsequent ops fail.

        long long orderId = orderRepo_->create(newOrder);
        if (orderId == 0) {
            throw InternalServerError("Failed to create order in database.");
        }
        newOrder.id = orderId; // Assign the new ID

        orderRepo_->addOrderItems(orderId, newOrder.items);

        // Update product stock (deduct quantities)
        for (const auto& change : stockChanges) {
            bool stockUpdated = productRepo_->updateStock(change.first, -change.second);
            if (!stockUpdated) {
                // This means either product was not found (already checked) or stock went below zero (should not happen due to prior check)
                throw InternalServerError("Failed to update stock for product ID " + std::to_string(change.first) + ". Rolling back order.");
            }
        }

        spdlog::info("Order ID {} created for user {}.", orderId, userId);
        return orderId;

    } catch (const ApiError& e) {
        // Handle rollback here if transaction management was explicit.
        // With current sync Drogon ORM, a failed subsequent operation leaves prior ops committed.
        // A more robust solution involves explicit transaction management.
        spdlog::error("Order creation failed due to API error. Attempting to clean up order {}. Error: {}", newOrder.id, e.what());
        if (newOrder.id > 0) { // If order was created, try to delete it
            orderRepo_->remove(newOrder.id);
        }
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error creating order for user {}: {}", userId, e.what());
        if (newOrder.id > 0) {
            orderRepo_->remove(newOrder.id);
        }
        throw InternalServerError("Failed to create order due to a server error.");
    }
}

bool OrderService::updateOrderStatus(long long orderId, const std::string& newStatus) {
    // Basic validation of status
    if (newStatus.empty() || (newStatus != "pending" && newStatus != "processed" && newStatus != "shipped" && newStatus != "delivered" && newStatus != "cancelled")) {
        throw BadRequestError("Invalid order status provided.");
    }

    auto order = orderRepo_->findById(orderId);
    if (!order) {
        throw NotFoundError("Order not found.");
    }

    // Example business logic for status transitions
    if (order->status == "delivered" || order->status == "cancelled") {
        throw BadRequestError("Cannot change status of a " + order->status + " order.");
    }
    if (order->status == "pending" && newStatus == "shipped") {
        throw BadRequestError("Order must be 'processed' before it can be 'shipped'.");
    }
    // Add more complex logic here as needed

    try {
        bool updated = orderRepo_->updateStatus(orderId, newStatus);
        if (updated) {
            spdlog::info("Order ID {} status updated to '{}'.", orderId, newStatus);
        } else {
            spdlog::warn("Order ID {} status update failed (no rows affected).", orderId);
        }
        return updated;
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error updating order status for order {}: {}", orderId, e.what());
        throw InternalServerError("Failed to update order status due to a server error.");
    }
}

bool OrderService::cancelOrder(long long orderId) {
    auto order = orderRepo_->findById(orderId);
    if (!order) {
        throw NotFoundError("Order not found.");
    }

    if (order->status == "shipped" || order->status == "delivered") {
        throw BadRequestError("Cannot cancel an order that has already been shipped or delivered.");
    }
    if (order->status == "cancelled") {
        spdlog::warn("Attempted to cancel already cancelled order ID {}.", orderId);
        return true; // Already cancelled, idempotency
    }

    // Roll back product stock if order is cancelled
    try {
        for (const auto& item : order->items) {
            bool stockReverted = productRepo_->updateStock(item.productId, item.quantity);
            if (!stockReverted) {
                spdlog::error("Failed to revert stock for product ID {} during order {} cancellation.", item.productId, orderId);
                // Depending on policy, this might make cancellation fail or log and proceed.
                // For now, let it fail the cancellation.
                throw InternalServerError("Failed to revert stock for some items. Order cancellation aborted.");
            }
        }
        bool updated = orderRepo_->updateStatus(orderId, "cancelled");
        if (updated) {
            spdlog::info("Order ID {} successfully cancelled and stock reverted.", orderId);
        } else {
            spdlog::warn("Order ID {} cancellation failed (status update failed).", orderId);
        }
        return updated;
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error cancelling order {}: {}", orderId, e.what());
        throw InternalServerError("Failed to cancel order due to a server error.");
    }
}

bool OrderService::deleteOrder(long long orderId) {
    // This function might be for admin only and should consider business rules
    // (e.g., only delete if cancelled or very old).
    // For this example, we'll just forward to the repository.
    auto order = orderRepo_->findById(orderId);
    if (!order) {
        throw NotFoundError("Order not found.");
    }
    // Business logic: only allow deletion of cancelled orders, or orders that haven't been processed.
    if (order->status != "cancelled" && order->status != "pending") {
         throw BadRequestError("Only 'pending' or 'cancelled' orders can be deleted.");
    }

    try {
        bool deleted = orderRepo_->remove(orderId);
        if (deleted) {
            spdlog::info("Order ID {} deleted (permanently removed).", orderId);
        } else {
            spdlog::warn("Order ID {} deletion failed (not found or no rows affected).", orderId);
        }
        return deleted;
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error deleting order {}: {}", orderId, e.what());
        throw InternalServerError("Failed to delete order due to a server error.");
    }
}

} // namespace services