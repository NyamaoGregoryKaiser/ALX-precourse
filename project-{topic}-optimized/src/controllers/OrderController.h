#pragma once

#include <drogon/HttpController.h>
#include <memory>
#include "services/OrderService.h"
#include "middleware/AuthMiddleware.h" // For filter

class OrderController : public drogon::HttpController<OrderController> {
public:
    OrderController();

    METHOD_LIST_BEGIN
    // User or Admin: Get order by ID
    METHOD_ADD(OrderController::getOrderById, "/orders/{id}", {drogon::HttpMethod::Get}, "AuthMiddleware", "ErrorHandler");

    // User or Admin: Get orders for the authenticated user
    METHOD_ADD(OrderController::getOrdersForUser, "/orders", {drogon::HttpMethod::Get}, "AuthMiddleware", "ErrorHandler");

    // User: Create a new order
    METHOD_ADD(OrderController::createOrder, "/orders", {drogon::HttpMethod::Post}, "AuthMiddleware", "ErrorHandler");

    // User: Cancel an order
    METHOD_ADD(OrderController::cancelOrder, "/orders/{id}/cancel", {drogon::HttpMethod::Post}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Update order status
    METHOD_ADD(OrderController::updateOrderStatus, "/admin/orders/{id}/status", {drogon::HttpMethod::Put}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Delete an order
    METHOD_ADD(OrderController::deleteOrder, "/admin/orders/{id}", {drogon::HttpMethod::Delete}, "AuthMiddleware", "ErrorHandler");
    METHOD_LIST_END

    void getOrderById(const drogon::HttpRequestPtr &req,
                      std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                      long long id);

    void getOrdersForUser(const drogon::HttpRequestPtr &req,
                          std::function<void (const drogon::HttpResponsePtr &)> &&callback);

    void createOrder(const drogon::HttpRequestPtr &req,
                     std::function<void (const drogon::HttpResponsePtr &)> &&callback);

    void cancelOrder(const drogon::HttpRequestPtr &req,
                     std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                     long long id);

    void updateOrderStatus(const drogon::HttpRequestPtr &req,
                           std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                           long long id);

    void deleteOrder(const drogon::HttpRequestPtr &req,
                     std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                     long long id);

private:
    std::shared_ptr<services::OrderService> orderService_;

    void requireAdmin(const drogon::HttpRequestPtr &req);
};