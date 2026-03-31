#include "OrderController.h"
#include "repositories/OrderRepository.h"
#include "repositories/ProductRepository.h"
#include "middleware/ErrorHandler.h"
#include <drogon/HttpAppFramework.h>
#include <spdlog/spdlog.h>

OrderController::OrderController() {
    auto dbClient = drogon::app().getDbClient(AppConfig::getInstance().getString("db_connection_name"));
    if (!dbClient) {
        spdlog::critical("OrderController: Failed to get DB client. Check app_config.json db_connection_name.");
        throw std::runtime_error("Database client not available.");
    }
    auto orderRepo = std::make_shared<repositories::OrderRepository>(dbClient);
    auto productRepo = std::make_shared<repositories::ProductRepository>(dbClient);
    orderService_ = std::make_shared<services::OrderService>(orderRepo, productRepo);
}

void OrderController::requireAdmin(const drogon::HttpRequestPtr &req) {
    if (!AuthMiddleware::hasRole(req, "admin")) {
        throw ForbiddenError("Access forbidden: Admin privileges required.");
    }
}

void OrderController::getOrderById(const drogon::HttpRequestPtr &req,
                                   std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                   long long id) {
    const auto& userInfo = req->attributes()->get<UserInfo>(CURRENT_USER_INFO_KEY);

    auto order = orderService_->getOrderById(id);
    if (!order) {
        throw NotFoundError("Order not found.");
    }

    // Authorization check: User can only view their own orders unless they are admin
    if (order->userId != userInfo.userId && userInfo.role != "admin") {
        throw ForbiddenError("Access forbidden: You can only view your own orders.");
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(order->toJson());
    callback(resp);
}

void OrderController::getOrdersForUser(const drogon::HttpRequestPtr &req,
                                       std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
    const auto& userInfo = req->attributes()->get<UserInfo>(CURRENT_USER_INFO_KEY);

    std::vector<models::Order> orders;
    if (userInfo.role == "admin") {
        // Admins can potentially view all orders, but for this endpoint,
        // we'll stick to 'user' behavior unless a query param specifies otherwise.
        // For simplicity, this endpoint only fetches for the authenticated user.
        // A separate admin endpoint would fetch all.
        orders = orderService_->getOrdersByUserId(userInfo.userId); // Still show admin their own orders
    } else {
        orders = orderService_->getOrdersByUserId(userInfo.userId);
    }

    Json::Value ordersJsonArray;
    for (const auto& order : orders) {
        ordersJsonArray.append(order.toJson());
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(ordersJsonArray);
    callback(resp);
}

void OrderController::createOrder(const drogon::HttpRequestPtr &req,
                                  std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
    const auto& userInfo = req->attributes()->get<UserInfo>(CURRENT_USER_INFO_KEY);

    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    if (!reqJson.isMember("items") || !reqJson["items"].isArray()) {
        throw BadRequestError("Missing 'items' array in request body.");
    }

    std::vector<models::OrderItem> items;
    for (const auto& itemJson : reqJson["items"]) {
        models::OrderItem item = models::OrderItem::fromJson(itemJson);
        if (item.productId == 0 || item.quantity == 0) {
            throw BadRequestError("Each order item must have a valid product_id and quantity.");
        }
        items.push_back(item);
    }

    long long newOrderId = orderService_->createOrder(userInfo.userId, items);

    Json::Value respJson;
    respJson["message"] = "Order created successfully.";
    respJson["id"] = newOrderId;
    auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void OrderController::cancelOrder(const drogon::HttpRequestPtr &req,
                                  std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                  long long id) {
    const auto& userInfo = req->attributes()->get<UserInfo>(CURRENT_USER_INFO_KEY);

    auto order = orderService_->getOrderById(id);
    if (!order) {
        throw NotFoundError("Order not found.");
    }

    // Authorization check: User can only cancel their own orders unless they are admin
    if (order->userId != userInfo.userId && userInfo.role != "admin") {
        throw ForbiddenError("Access forbidden: You can only cancel your own orders.");
    }

    if (orderService_->cancelOrder(id)) {
        Json::Value respJson;
        respJson["message"] = "Order cancelled successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        // Service might throw more specific errors that are caught by ErrorHandler
        throw InternalServerError("Failed to cancel order.");
    }
}

void OrderController::updateOrderStatus(const drogon::HttpRequestPtr &req,
                                        std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                        long long id) {
    requireAdmin(req);

    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    if (!reqJson.isMember("status") || !reqJson["status"].isString()) {
        throw BadRequestError("Missing 'status' field in request body.");
    }

    std::string newStatus = reqJson["status"].asString();

    if (orderService_->updateOrderStatus(id, newStatus)) {
        Json::Value respJson;
        respJson["message"] = "Order status updated successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        throw InternalServerError("Failed to update order status.");
    }
}

void OrderController::deleteOrder(const drogon::HttpRequestPtr &req,
                                  std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                  long long id) {
    requireAdmin(req);

    if (orderService_->deleteOrder(id)) {
        Json::Value respJson;
        respJson["message"] = "Order deleted successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        throw NotFoundError("Order not found or deletion failed.");
    }
}