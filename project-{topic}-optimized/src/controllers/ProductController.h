#pragma once

#include <drogon/HttpController.h>
#include <memory>
#include "services/ProductService.h"
#include "middleware/AuthMiddleware.h" // For filter

class ProductController : public drogon::HttpController<ProductController> {
public:
    ProductController();

    METHOD_LIST_BEGIN
    // Public endpoint: Get all products
    METHOD_ADD(ProductController::getAllProducts, "/products", {drogon::HttpMethod::Get}, "ErrorHandler");

    // Public endpoint: Get product by ID
    METHOD_ADD(ProductController::getProductById, "/products/{id}", {drogon::HttpMethod::Get}, "ErrorHandler");

    // Admin only: Create new product
    METHOD_ADD(ProductController::createProduct, "/admin/products", {drogon::HttpMethod::Post}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Update product by ID
    METHOD_ADD(ProductController::updateProduct, "/admin/products/{id}", {drogon::HttpMethod::Put}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Delete product by ID
    METHOD_ADD(ProductController::deleteProduct, "/admin/products/{id}", {drogon::HttpMethod::Delete}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Update product stock
    METHOD_ADD(ProductController::updateProductStock, "/admin/products/{id}/stock", {drogon::HttpMethod::Put}, "AuthMiddleware", "ErrorHandler");
    METHOD_LIST_END

    void getAllProducts(const drogon::HttpRequestPtr &req,
                        std::function<void (const drogon::HttpResponsePtr &)> &&callback);

    void getProductById(const drogon::HttpRequestPtr &req,
                        std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                        long long id);

    void createProduct(const drogon::HttpRequestPtr &req,
                       std::function<void (const drogon::HttpResponsePtr &)> &&callback);

    void updateProduct(const drogon::HttpRequestPtr &req,
                       std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                       long long id);

    void deleteProduct(const drogon::HttpRequestPtr &req,
                       std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                       long long id);

    void updateProductStock(const drogon::HttpRequestPtr &req,
                            std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                            long long id);

private:
    std::shared_ptr<services::ProductService> productService_;

    // Helper to check for admin role
    void requireAdmin(const drogon::HttpRequestPtr &req);
};