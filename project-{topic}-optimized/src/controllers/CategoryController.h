```cpp
#pragma once

#include <drogon/HttpController.h>
#include "../models/Category.h"
#include "../utils/ApiResponse.h"
#include "../services/AuthService.h" // Needed for user verification if CategoryService not separated

// For simplicity, CategoryController will interact directly with DB for categories,
// or we could create a CategoryService similar to TaskService.
// Given the scope, direct DB access from controller will be done for categories.
// In a larger system, a dedicated `CategoryService` would be preferred.

class CategoryController : public drogon::HttpController<CategoryController> {
public:
    CategoryController(drogon::orm::DbClientPtr dbClient, AuthService& authService) 
        : dbClient_(dbClient), authService_(authService) {}

    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CategoryController::getCategories, "/api/v1/categories", drogon::Get, "AuthFilter");
    ADD_METHOD_TO(CategoryController::createCategory, "/api/v1/categories", drogon::Post, "AuthFilter");
    ADD_METHOD_TO(CategoryController::getCategoryById, "/api/v1/categories/{id}", drogon::Get, "AuthFilter");
    ADD_METHOD_TO(CategoryController::updateCategory, "/api/v1/categories/{id}", drogon::Put, "AuthFilter");
    ADD_METHOD_TO(CategoryController::deleteCategory, "/api/v1/categories/{id}", drogon::Delete, "AuthFilter");
    METHOD_LIST_END

    void getCategories(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void createCategory(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getCategoryById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);
    void updateCategory(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);
    void deleteCategory(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);

private:
    drogon::orm::DbClientPtr dbClient_;
    AuthService& authService_; // For user context
};
```