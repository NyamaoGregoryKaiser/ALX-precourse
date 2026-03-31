#include "ProductService.h"
#include "middleware/ErrorHandler.h"
#include <spdlog/spdlog.h>

namespace services {

ProductService::ProductService(std::shared_ptr<repositories::ProductRepository> productRepo)
    : productRepo_(std::move(productRepo)) {
    if (!productRepo_) {
        spdlog::critical("ProductService initialized with null ProductRepository!");
        throw std::runtime_error("ProductRepository is not initialized.");
    }
}

std::optional<models::Product> ProductService::getProductById(long long productId) {
    auto product = productRepo_->findById(productId);
    if (!product) {
        spdlog::warn("Product ID {} not found.", productId);
    }
    return product;
}

std::vector<models::Product> ProductService::getAllProducts() {
    return productRepo_->findAll();
}

long long ProductService::createProduct(const models::Product& product) {
    if (product.name.empty() || product.description.empty() || product.price <= 0 || product.stockQuantity < 0) {
        throw BadRequestError("Invalid product data provided. Name, description, positive price, and non-negative stock required.");
    }

    try {
        long long newProductId = productRepo_->create(product);
        if (newProductId > 0) {
            spdlog::info("Product created: {} (ID: {}).", product.name, newProductId);
            return newProductId;
        } else {
            spdlog::error("Failed to create product in database: {}.", product.name);
            throw InternalServerError("Failed to create product.");
        }
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error creating product {}: {}", product.name, e.what());
        throw InternalServerError("Failed to create product due to a server error.");
    }
}

bool ProductService::updateProduct(long long productId, const models::Product& product) {
    auto existingProduct = productRepo_->findById(productId);
    if (!existingProduct) {
        throw NotFoundError("Product not found.");
    }

    if (product.name.empty() || product.description.empty() || product.price <= 0 || product.stockQuantity < 0) {
        throw BadRequestError("Invalid product data provided. Name, description, positive price, and non-negative stock required for update.");
    }

    // Only update fields that are provided/valid
    existingProduct->name = product.name;
    existingProduct->description = product.description;
    existingProduct->price = product.price;
    existingProduct->stockQuantity = product.stockQuantity;

    try {
        bool updated = productRepo_->update(*existingProduct);
        if (updated) {
            spdlog::info("Product ID {} updated.", productId);
        } else {
            spdlog::warn("Product ID {} update failed (no rows affected).", productId);
        }
        return updated;
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error updating product {}: {}", productId, e.what());
        throw InternalServerError("Failed to update product due to a server error.");
    }
}

bool ProductService::deleteProduct(long long productId) {
    try {
        bool deleted = productRepo_->remove(productId);
        if (deleted) {
            spdlog::info("Product ID {} deleted.", productId);
        } else {
            spdlog::warn("Product ID {} deletion failed (not found or no rows affected).", productId);
        }
        return deleted;
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error deleting product {}: {}", productId, e.what());
        throw InternalServerError("Failed to delete product due to a server error.");
    }
}

bool ProductService::updateProductStock(long long productId, int quantityChange) {
    if (quantityChange == 0) {
        return true; // No change needed
    }

    // Check if product exists first
    auto product = productRepo_->findById(productId);
    if (!product) {
        throw NotFoundError("Product not found.");
    }

    // Check for negative stock quantity resulting from the change
    if (product->stockQuantity + quantityChange < 0) {
        throw BadRequestError("Insufficient stock for product ID " + std::to_string(productId) + ".");
    }

    try {
        bool updated = productRepo_->updateStock(productId, quantityChange);
        if (updated) {
            spdlog::info("Stock for product ID {} updated by {}.", productId, quantityChange);
        } else {
            spdlog::warn("Stock update for product ID {} failed (no rows affected or insufficient stock).", productId);
        }
        return updated;
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error updating stock for product {}: {}", productId, e.what());
        throw InternalServerError("Failed to update product stock due to a server error.");
    }
}

} // namespace services