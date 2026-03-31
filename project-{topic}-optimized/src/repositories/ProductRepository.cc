#include "ProductRepository.h"
#include <drogon/orm/Exception.h>
#include <spdlog/spdlog.h>
#include "middleware/ErrorHandler.h" // For custom exceptions

namespace repositories {

ProductRepository::ProductRepository(drogon::orm::DbClientPtr dbClient) : dbClient_(std::move(dbClient)) {
    if (!dbClient_) {
        spdlog::critical("ProductRepository initialized with null DbClientPtr!");
        throw std::runtime_error("Database client is not initialized.");
    }
}

std::optional<models::Product> ProductRepository::findById(long long id) {
    std::string sql = "SELECT id, name, description, price, stock_quantity, created_at, updated_at FROM products WHERE id = $1";
    try {
        auto result = dbClient_->execSqlSync(sql, id);
        if (!result.empty()) {
            const auto& row = result[0];
            models::Product product;
            product.id = row["id"].as<long long>();
            product.name = row["name"].as<std::string>();
            product.description = row["description"].as<std::string>();
            product.price = row["price"].as<double>();
            product.stockQuantity = row["stock_quantity"].as<int>();
            product.createdAt = row["created_at"].as<std::string>();
            product.updatedAt = row["updated_at"].as<std::string>();
            return product;
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findById (Product): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findById (Product): {}", e.what());
    }
    return std::nullopt;
}

std::vector<models::Product> ProductRepository::findAll() {
    std::vector<models::Product> products;
    std::string sql = "SELECT id, name, description, price, stock_quantity, created_at, updated_at FROM products ORDER BY id";
    try {
        auto result = dbClient_->execSqlSync(sql);
        for (const auto& row : result) {
            models::Product product;
            product.id = row["id"].as<long long>();
            product.name = row["name"].as<std::string>();
            product.description = row["description"].as<std::string>();
            product.price = row["price"].as<double>();
            product.stockQuantity = row["stock_quantity"].as<int>();
            product.createdAt = row["created_at"].as<std::string>();
            product.updatedAt = row["updated_at"].as<std::string>();
            products.push_back(product);
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findAll (Product): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findAll (Product): {}", e.what());
    }
    return products;
}

long long ProductRepository::create(const models::Product& product) {
    std::string sql = "INSERT INTO products (name, description, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING id";
    try {
        auto result = dbClient_->execSqlSync(sql,
                                             product.name,
                                             product.description,
                                             product.price,
                                             product.stockQuantity);
        if (!result.empty()) {
            return result[0]["id"].as<long long>();
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in create (Product): {}", e.what());
        // Check for unique constraint violation if product name needs to be unique
        if (std::string(e.what()).find("duplicate key value violates unique constraint") != std::string::npos) {
             throw ConflictError("Product with this name already exists.");
        }
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in create (Product): {}", e.what());
        throw;
    }
    return 0;
}

bool ProductRepository::update(const models::Product& product) {
    std::string sql = "UPDATE products SET name = $1, description = $2, price = $3, stock_quantity = $4, updated_at = NOW() WHERE id = $5";
    try {
        size_t affectedRows = dbClient_->execSqlSync(sql,
                                                 product.name,
                                                 product.description,
                                                 product.price,
                                                 product.stockQuantity,
                                                 product.id).affectedRows();
        return affectedRows > 0;
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in update (Product): {}", e.what());
         if (std::string(e.what()).find("duplicate key value violates unique constraint") != std::string::npos) {
             throw ConflictError("Another product with this name already exists.");
        }
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in update (Product): {}", e.what());
        throw;
    }
}

bool ProductRepository::remove(long long id) {
    std::string sql = "DELETE FROM products WHERE id = $1";
    try {
        size_t affectedRows = dbClient_->execSqlSync(sql, id).affectedRows();
        return affectedRows > 0;
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in remove (Product): {}", e.what());
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in remove (Product): {}", e.what());
        throw;
    }
}

bool ProductRepository::updateStock(long long productId, int quantityChange) {
    std::string sql = "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2 AND stock_quantity + $1 >= 0";
    try {
        size_t affectedRows = dbClient_->execSqlSync(sql, quantityChange, productId).affectedRows();
        return affectedRows > 0;
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in updateStock (Product): {}", e.what());
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in updateStock (Product): {}", e.what());
        throw;
    }
}

std::optional<int> ProductRepository::getStock(long long productId) {
    std::string sql = "SELECT stock_quantity FROM products WHERE id = $1";
    try {
        auto result = dbClient_->execSqlSync(sql, productId);
        if (!result.empty()) {
            return result[0]["stock_quantity"].as<int>();
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in getStock (Product): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in getStock (Product): {}", e.what());
    }
    return std::nullopt;
}

} // namespace repositories