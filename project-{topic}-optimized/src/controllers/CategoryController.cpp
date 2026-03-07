```cpp
#include "CategoryController.h"
#include <json/json.h>
#include <vector>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>

// Helper to get user_id from request attributes set by AuthFilter
extern int getUserIdFromRequest(const drogon::HttpRequestPtr& req); // From TaskController.cpp

std::string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&now_c), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

void CategoryController::getCategories(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    drogon::app().getLoop()->queueInLoop([this, userId, callback]() {
        drogon::Task<void> getCategoriesTask = [this, userId, callback]() -> drogon::Task<void> {
            try {
                auto result = co_await dbClient_->execSqlCoro("SELECT * FROM categories WHERE user_id = ?;", userId);
                Json::Value dataArray;
                for (size_t i = 0; i < result.size(); ++i) {
                    dataArray.append(Category::fromDbResult(result, i).toJson());
                }
                callback(ApiResponse::makeSuccessResponse(dataArray, "Categories retrieved successfully"));
            } catch (const drogon::orm::DrogonDbException& e) {
                LOG_ERROR << "Database error fetching categories: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            } catch (const std::exception& e) {
                LOG_ERROR << "Unhandled exception in getCategories: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            }
        }();
        getCategoriesTask.run(); // Run the coroutine task
    });
}

void CategoryController::createCategory(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    if (req->contentType() != drogon::CT_APPLICATION_JSON) {
        return callback(ApiResponse::makeErrorResponse("Content-Type must be application/json", drogon::k400BadRequest));
    }

    try {
        const Json::Value& jsonBody = *req->getJsonObject();
        if (!jsonBody.isMember("name") || !jsonBody["name"].isString() || jsonBody["name"].asString().empty()) {
            return callback(ApiResponse::makeErrorResponse("Missing or invalid 'name' field", drogon::k400BadRequest));
        }

        std::string categoryName = jsonBody["name"].asString();

        drogon::app().getLoop()->queueInLoop([this, userId, categoryName, callback]() {
            drogon::Task<void> createCategoryTask = [this, userId, categoryName, callback]() -> drogon::Task<void> {
                try {
                    // Check if category name already exists for this user
                    auto checkResult = co_await dbClient_->execSqlCoro("SELECT id FROM categories WHERE user_id = ? AND name = ?;", userId, categoryName);
                    if (!checkResult.empty()) {
                        throw drogon::HttpException("Category with this name already exists for this user", drogon::k409Conflict);
                    }

                    std::string createdAt = getCurrentTimestamp();
                    auto result = co_await dbClient_->execSqlCoro(
                        "INSERT INTO categories (name, user_id, created_at) VALUES (?, ?, ?) RETURNING id;",
                        categoryName,
                        userId,
                        createdAt
                    );
                    Category newCategory;
                    newCategory.id = result[0]["id"].as<int>();
                    newCategory.name = categoryName;
                    newCategory.user_id = userId;
                    newCategory.created_at = createdAt;
                    callback(ApiResponse::makeSuccessResponse(newCategory.toJson(), "Category created successfully"));
                } catch (const drogon::HttpException& e) {
                    callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
                } catch (const drogon::orm::DrogonDbException& e) {
                    LOG_ERROR << "Database error creating category: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                } catch (const std::exception& e) {
                    LOG_ERROR << "Unhandled exception in createCategory: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                }
            }();
            createCategoryTask.run();
        });

    } catch (const Json::Exception& e) {
        return callback(ApiResponse::makeErrorResponse("Invalid JSON format", drogon::k400BadRequest));
    } catch (const std::exception& e) {
        LOG_ERROR << "Error in createCategory: " << e.what();
        return callback(ApiResponse::makeInternalServerErrorResponse());
    }
}

void CategoryController::getCategoryById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    drogon::app().getLoop()->queueInLoop([this, id, userId, callback]() {
        drogon::Task<void> getCategoryTask = [this, id, userId, callback]() -> drogon::Task<void> {
            try {
                auto result = co_await dbClient_->execSqlCoro("SELECT * FROM categories WHERE id = ? AND user_id = ?;", id, userId);
                if (result.empty()) {
                    callback(ApiResponse::makeNotFoundResponse("Category"));
                } else {
                    callback(ApiResponse::makeSuccessResponse(Category::fromDbResult(result, 0).toJson(), "Category retrieved successfully"));
                }
            } catch (const drogon::orm::DrogonDbException& e) {
                LOG_ERROR << "Database error fetching category by ID: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            } catch (const std::exception& e) {
                LOG_ERROR << "Unhandled exception in getCategoryById: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            }
        }();
        getCategoryTask.run();
    });
}

void CategoryController::updateCategory(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    if (req->contentType() != drogon::CT_APPLICATION_JSON) {
        return callback(ApiResponse::makeErrorResponse("Content-Type must be application/json", drogon::k400BadRequest));
    }

    try {
        const Json::Value& jsonBody = *req->getJsonObject();
        if (!jsonBody.isMember("name") || !jsonBody["name"].isString() || jsonBody["name"].asString().empty()) {
            return callback(ApiResponse::makeErrorResponse("Missing or invalid 'name' field", drogon::k400BadRequest));
        }

        std::string categoryName = jsonBody["name"].asString();

        drogon::app().getLoop()->queueInLoop([this, id, userId, categoryName, callback]() {
            drogon::Task<void> updateCategoryTask = [this, id, userId, categoryName, callback]() -> drogon::Task<void> {
                try {
                    // Check if category exists and belongs to user
                    auto existingCategoryResult = co_await dbClient_->execSqlCoro("SELECT id FROM categories WHERE id = ? AND user_id = ?;", id, userId);
                    if (existingCategoryResult.empty()) {
                        throw drogon::HttpException("Category not found or not owned by user", drogon::k404NotFound);
                    }

                    // Check for name collision with other categories of the same user
                    auto nameCheckResult = co_await dbClient_->execSqlCoro("SELECT id FROM categories WHERE user_id = ? AND name = ? AND id != ?;", userId, categoryName, id);
                    if (!nameCheckResult.empty()) {
                        throw drogon::HttpException("Another category with this name already exists for this user", drogon::k409Conflict);
                    }

                    auto result = co_await dbClient_->execSqlCoro("UPDATE categories SET name = ? WHERE id = ? AND user_id = ? RETURNING *;", categoryName, id, userId);
                    if (result.empty()) {
                        // This case should ideally not be reached if previous checks passed, but for safety
                        throw drogon::HttpException("Failed to update category", drogon::k500InternalServerError);
                    }
                    callback(ApiResponse::makeSuccessResponse(Category::fromDbResult(result, 0).toJson(), "Category updated successfully"));
                } catch (const drogon::HttpException& e) {
                    callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
                } catch (const drogon::orm::DrogonDbException& e) {
                    LOG_ERROR << "Database error updating category: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                } catch (const std::exception& e) {
                    LOG_ERROR << "Unhandled exception in updateCategory: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                }
            }();
            updateCategoryTask.run();
        });

    } catch (const Json::Exception& e) {
        return callback(ApiResponse::makeErrorResponse("Invalid JSON format", drogon::k400BadRequest));
    } catch (const std::exception& e) {
        LOG_ERROR << "Error in updateCategory: " << e.what();
        return callback(ApiResponse::makeInternalServerErrorResponse());
    }
}

void CategoryController::deleteCategory(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    drogon::app().getLoop()->queueInLoop([this, id, userId, callback]() {
        drogon::Task<void> deleteTask = [this, id, userId, callback]() -> drogon::Task<void> {
            try {
                // Before deleting category, consider updating tasks that use this category_id to NULL or another default.
                // For simplicity, we assume CASCADE DELETE is handled by DB or accept foreign key errors.
                // Or, more robustly:
                // co_await dbClient_->execSqlCoro("UPDATE tasks SET category_id = NULL WHERE category_id = ? AND user_id = ?;", id, userId);

                auto result = co_await dbClient_->execSqlCoro("DELETE FROM categories WHERE id = ? AND user_id = ?;", id, userId);
                if (result.affectedRows() == 0) {
                    callback(ApiResponse::makeNotFoundResponse("Category"));
                } else {
                    callback(ApiResponse::makeSuccessResponse(Json::Value(), "Category deleted successfully"));
                }
            } catch (const drogon::orm::DrogonDbException& e) {
                LOG_ERROR << "Database error deleting category: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            } catch (const std::exception& e) {
                LOG_ERROR << "Unhandled exception in deleteCategory: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            }
        }();
        deleteTask.run();
    });
}
```