```cpp
#ifndef ECOMMERCE_PRODUCT_SERVICE_H
#define ECOMMERCE_PRODUCT_SERVICE_H

#include "../db/db_manager.h"
#include "../models/product.h"
#include "../middleware/error_middleware.h" // For custom exceptions
#include <string>
#include <vector>
#include <optional>
#include <chrono>
#include <map>
#include <mutex>
#include <spdlog/spdlog.h>

// Simple in-memory cache for products
struct CacheEntry {
    Product product;
    std::chrono::steady_clock::time_point expiry_time;
};

class CacheManager {
public:
    CacheManager(std::chrono::seconds ttl = std::chrono::seconds(300)) : default_ttl_(ttl), logger_(spdlog::get("ecommerce_logger")) {
        if (!logger_) {
            logger_ = spdlog::stdout_color_mt("cache_manager_logger");
        }
    }

    void put(int id, const Product& product) {
        std::lock_guard<std::mutex> lock(mtx_);
        cache_[id] = {product, std::chrono::steady_clock::now() + default_ttl_};
        logger_->debug("Cached product ID: {}", id);
    }

    std::optional<Product> get(int id) {
        std::lock_guard<std::mutex> lock(mtx_);
        auto it = cache_.find(id);
        if (it != cache_.end()) {
            if (it->second.expiry_time > std::chrono::steady_clock::now()) {
                logger_->debug("Cache hit for product ID: {}", id);
                return it->second.product;
            } else {
                logger_->debug("Cache expired for product ID: {}", id);
                cache_.erase(it); // Remove expired item
            }
        }
        logger_->debug("Cache miss for product ID: {}", id);
        return std::nullopt;
    }

    void invalidate(int id) {
        std::lock_guard<std::mutex> lock(mtx_);
        auto it = cache_.find(id);
        if (it != cache_.end()) {
            cache_.erase(it);
            logger_->debug("Invalidated cache for product ID: {}", id);
        }
    }

    void clear() {
        std::lock_guard<std::mutex> lock(mtx_);
        cache_.clear();
        logger_->debug("Cleared entire product cache.");
    }

private:
    std::map<int, CacheEntry> cache_;
    std::mutex mtx_;
    std::chrono::seconds default_ttl_;
    std::shared_ptr<spdlog::logger> logger_;
};

class ProductService {
public:
    ProductService(DBManager& db_manager);

    Product create_product(const Product& product);
    Product get_product_by_id(int id);
    std::vector<Product> get_all_products(const std::string& search_term, int limit, int offset);
    Product update_product(const Product& product);
    void delete_product(int id);

private:
    DBManager& db_manager_;
    CacheManager product_cache_;
    std::shared_ptr<spdlog::logger> logger_;
};

#endif // ECOMMERCE_PRODUCT_SERVICE_H
```