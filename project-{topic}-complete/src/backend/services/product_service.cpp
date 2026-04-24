```cpp
#include "product_service.h"

ProductService::ProductService(DBManager& db_manager)
    : db_manager_(db_manager), product_cache_(), logger_(spdlog::get("ecommerce_logger")) {
    if (!logger_) {
        logger_ = spdlog::stdout_color_mt("product_service_logger");
    }
}

Product ProductService::create_product(const Product& product) {
    if (product.name.empty() || product.price < 0 || product.stock < 0) {
        throw BadRequestException("Invalid product data: Name, price, and stock are required and must be valid.");
    }

    // Check if product name already exists
    try {
        auto products = db_manager_.get_all_products(product.name, 1, 0);
        for(const auto& p : products) {
            if (p.name == product.name) {
                throw ConflictException("Product with this name already exists.");
            }
        }
    } catch (const DBGenericException& e) {
        // If the search query fails, we can proceed, but log it.
        logger_->warn("Failed to check for existing product name during creation: {}", e.what());
    }

    Product created_product = db_manager_.create_product(product);
    product_cache_.invalidate(created_product.id); // Invalidate cache for all products if it was cached
    product_cache_.put(created_product.id, created_product); // Cache the new product
    logger_->info("Product created: ID={}, Name={}", created_product.id, created_product.name);
    return created_product;
}

Product ProductService::get_product_by_id(int id) {
    // Try to get from cache first
    std::optional<Product> cached_product = product_cache_.get(id);
    if (cached_product) {
        return cached_product.value();
    }

    std::optional<Product> product_opt = db_manager_.get_product_by_id(id);
    if (!product_opt) {
        throw NotFoundException("Product with ID " + std::to_string(id) + " not found.");
    }

    Product product = product_opt.value();
    product_cache_.put(id, product); // Cache the retrieved product
    logger_->info("Product retrieved: ID={}, Name={}", product.id, product.name);
    return product;
}

std::vector<Product> ProductService::get_all_products(const std::string& search_term, int limit, int offset) {
    // For search, limit, offset, caching entire result sets is complex.
    // We'll rely on DB for these queries directly for now.
    // A more advanced cache would involve query caching with invalidation strategies.
    logger_->info("Retrieving all products with search='{}', limit={}, offset={}", search_term, limit, offset);
    return db_manager_.get_all_products(search_term, limit, offset);
}

Product ProductService::update_product(const Product& product) {
    // Basic validation
    if (product.id <= 0) {
        throw BadRequestException("Invalid product ID for update.");
    }
    if (!product.name.empty() && product.name.length() < 3) {
        throw BadRequestException("Product name must be at least 3 characters long.");
    }
    if (product.price < 0) {
        throw BadRequestException("Product price cannot be negative.");
    }
    if (product.stock < 0) {
        throw BadRequestException("Product stock cannot be negative.");
    }

    Product updated_product = db_manager_.update_product(product);
    product_cache_.invalidate(updated_product.id); // Invalidate cache for this product
    product_cache_.put(updated_product.id, updated_product); // Update cache with new product details
    logger_->info("Product updated: ID={}, Name={}", updated_product.id, updated_product.name);
    return updated_product;
}

void ProductService::delete_product(int id) {
    if (id <= 0) {
        throw BadRequestException("Invalid product ID for delete.");
    }
    db_manager_.delete_product(id);
    product_cache_.invalidate(id); // Invalidate cache for this product
    logger_->info("Product deleted: ID={}", id);
}
```