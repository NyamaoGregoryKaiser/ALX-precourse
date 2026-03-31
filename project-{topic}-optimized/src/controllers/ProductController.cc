#include "ProductController.h"
#include "repositories/ProductRepository.h"
#include "middleware/ErrorHandler.h"
#include <drogon/HttpAppFramework.h>
#include <spdlog/spdlog.h>

ProductController::ProductController() {
    auto dbClient = drogon::app().getDbClient(AppConfig::getInstance().getString("db_connection_name"));
    if (!dbClient) {
        spdlog::critical("ProductController: Failed to get DB client. Check app_config.json db_connection_name.");
        throw std::runtime_error("Database client not available.");
    }
    auto productRepo = std::make_shared<repositories::ProductRepository>(dbClient);
    productService_ = std::make_shared<services::ProductService>(productRepo);
}

void ProductController::requireAdmin(const drogon::HttpRequestPtr &req) {
    if (!AuthMiddleware::hasRole(req, "admin")) {
        throw ForbiddenError("Access forbidden: Admin privileges required.");
    }
}

void ProductController::getAllProducts(const drogon::HttpRequestPtr &req,
                                       std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
    auto products = productService_->getAllProducts();
    Json::Value productsJsonArray;
    for (const auto& product : products) {
        productsJsonArray.append(product.toJson());
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(productsJsonArray);
    callback(resp);
}

void ProductController::getProductById(const drogon::HttpRequestPtr &req,
                                       std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                       long long id) {
    auto product = productService_->getProductById(id);
    if (!product) {
        throw NotFoundError("Product not found.");
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(product->toJson());
    callback(resp);
}

void ProductController::createProduct(const drogon::HttpRequestPtr &req,
                                      std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
    requireAdmin(req);

    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    models::Product newProduct = models::Product::fromJson(reqJson);
    if (newProduct.name.empty() || newProduct.description.empty() || newProduct.price <= 0 || newProduct.stockQuantity < 0) {
        throw BadRequestError("Missing or invalid product fields: name, description, price (must be positive), stock_quantity (must be non-negative).");
    }

    long long newId = productService_->createProduct(newProduct);
    Json::Value respJson;
    respJson["message"] = "Product created successfully.";
    respJson["id"] = newId;
    auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void ProductController::updateProduct(const drogon::HttpRequestPtr &req,
                                      std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                      long long id) {
    requireAdmin(req);

    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    models::Product updatedProduct = models::Product::fromJson(reqJson);
    // Ensure ID from path is used for update
    updatedProduct.id = id;

    if (updatedProduct.name.empty() || updatedProduct.description.empty() || updatedProduct.price <= 0 || updatedProduct.stockQuantity < 0) {
        throw BadRequestError("Missing or invalid product fields: name, description, price (must be positive), stock_quantity (must be non-negative).");
    }

    if (productService_->updateProduct(id, updatedProduct)) {
        Json::Value respJson;
        respJson["message"] = "Product updated successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        throw NotFoundError("Product not found or update failed.");
    }
}

void ProductController::deleteProduct(const drogon::HttpRequestPtr &req,
                                      std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                      long long id) {
    requireAdmin(req);

    if (productService_->deleteProduct(id)) {
        Json::Value respJson;
        respJson["message"] = "Product deleted successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        throw NotFoundError("Product not found or deletion failed.");
    }
}

void ProductController::updateProductStock(const drogon::HttpRequestPtr &req,
                                           std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                           long long id) {
    requireAdmin(req);

    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    if (!reqJson.isMember("quantity_change") || !reqJson["quantity_change"].isInt()) {
        throw BadRequestError("Missing or invalid 'quantity_change' field (must be an integer).");
    }

    int quantityChange = reqJson["quantity_change"].asInt();

    if (productService_->updateProductStock(id, quantityChange)) {
        Json::Value respJson;
        respJson["message"] = "Product stock updated successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        throw InternalServerError("Failed to update product stock."); // Specific error like NotFound or BadRequest would be thrown by service.
    }
}