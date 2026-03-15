#ifndef PRODUCT_SERVICE_H
#define PRODUCT_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include "../models/Product.h"
#include "../utils/Database.h"
#include "../utils/Logger.h"
#include "../utils/ErrorHandler.h"
#include "../utils/Caching.h"

class ProductService {
private:
    Database& db;

    // Helper to convert JSON result to Product object
    std::optional<Product> json_to_product(const crow::json::wvalue& json) {
        if (!json.has("id") || !json.has("name") || !json.has("description") ||
            !json.has("price") || !json.has("stock_quantity") ||
            !json.has("created_at") || !json.has("updated_at")) {
            return std::nullopt;
        }
        return Product(
            static_cast<long long>(json["id"].i()),
            json["name"].s(),
            json["description"].s(),
            json["price"].d(),
            static_cast<int>(json["stock_quantity"].i()),
            json["created_at"].s(),
            json["updated_at"].s()
        );
    }

public:
    ProductService(Database& database_instance) : db(database_instance) {
        LOG_INFO("ProductService initialized.");
    }

    /**
     * @brief Creates a new product in the database.
     * @param name The product name (must be unique).
     * @param description The product description.
     * @param price The product price.
     * @param stock_quantity The quantity in stock.
     * @return The created Product object with its assigned ID.
     * @throws ConflictException if product name already exists.
     * @throws BadRequestException if input data is invalid.
     */
    Product createProduct(const std::string& name, const std::string& description,
                          double price, int stock_quantity) {
        if (name.empty() || price < 0 || stock_quantity < 0) {
            throw BadRequestException("Invalid product data: name, price, and stock quantity are required and must be valid.");
        }

        if (findByName(name).has_value()) {
            throw ConflictException("Product with this name already exists.");
        }

        try {
            db.execute(
                "INSERT INTO products (name, description, price, stock_quantity) VALUES (?, ?, ?, ?)",
                name, description, price, stock_quantity
            );
            long long new_id = db.lastInsertRowId();
            LOG_INFO("Product created with ID: {}", new_id);
            Cache::app_cache.remove("all_products"); // Invalidate cache for all products
            return getProductById(new_id).value(); // Retrieve the newly created product
        } catch (const ConflictException& e) {
            throw e; // Re-throw DB's conflict exception
        } catch (const InternalServerException& e) {
            LOG_ERROR("Failed to create product {}: {}", name, e.what());
            throw InternalServerException("Failed to create product.");
        }
    }

    /**
     * @brief Retrieves a product by its ID.
     * @param id The ID of the product.
     * @return An optional Product object.
     * @throws NotFoundException if the product does not exist.
     */
    std::optional<Product> getProductById(long long id) {
        // Try to get from cache first
        std::string cache_key = "product_" + std::to_string(id);
        if (auto cached_product_json_str = Cache::app_cache.get(cache_key)) {
            crow::json::rvalue json_val = crow::json::load(*cached_product_json_str);
            if (json_val) {
                if (auto product = json_to_product(json_val)) {
                    LOG_DEBUG("Product {} retrieved from cache.", id);
                    return product;
                }
            }
        }

        auto results = db.query("SELECT * FROM products WHERE id = ?", id);
        if (results.empty()) {
            LOG_DEBUG("Product with ID {} not found.", id);
            return std::nullopt;
        }

        if (auto product = json_to_product(results[0])) {
            Cache::app_cache.set(cache_key, results[0].dump()); // Cache the product
            LOG_DEBUG("Product {} retrieved from DB and cached.", id);
            return product;
        }
        return std::nullopt; // Should not happen if DB returns valid data
    }

    /**
     * @brief Retrieves all products.
     * @return A vector of Product objects.
     */
    std::vector<Product> getAllProducts() {
        // Try to get from cache first
        std::string cache_key = "all_products";
        if (auto cached_products_json_str = Cache::app_cache.get(cache_key)) {
            crow::json::rvalue json_val = crow::json::load(*cached_products_json_str);
            if (json_val.is_array()) {
                std::vector<Product> products;
                for (const auto& json_product : json_val) {
                    if (auto product = json_to_product(json_product)) {
                        products.push_back(*product);
                    }
                }
                LOG_DEBUG("All products retrieved from cache. Count: {}", products.size());
                return products;
            }
        }

        auto results = db.query("SELECT * FROM products");
        std::vector<Product> products;
        crow::json::wvalue products_json_array = crow::json::wvalue::list();
        for (const auto& json_product : results) {
            if (auto product = json_to_product(json_product)) {
                products.push_back(*product);
                products_json_array.add(json_product);
            }
        }
        LOG_DEBUG("Retrieved {} products from DB.", products.size());
        Cache::app_cache.set(cache_key, products_json_array.dump()); // Cache all products
        return products;
    }

    /**
     * @brief Finds a product by its name.
     * @param name The product name to search for.
     * @return An optional Product object.
     */
    std::optional<Product> findByName(const std::string& name) {
        auto results = db.query("SELECT * FROM products WHERE name = ?", name);
        if (results.empty()) {
            return std::nullopt;
        }
        return json_to_product(results[0]);
    }

    /**
     * @brief Updates an existing product's details.
     * @param id The ID of the product to update.
     * @param name_opt Optional new name.
     * @param description_opt Optional new description.
     * @param price_opt Optional new price.
     * @param stock_quantity_opt Optional new stock quantity.
     * @return The updated Product object.
     * @throws NotFoundException if the product does not exist.
     * @throws ConflictException if the new name already exists.
     * @throws BadRequestException if update data is invalid.
     */
    Product updateProduct(long long id,
                          const std::optional<std::string>& name_opt,
                          const std::optional<std::string>& description_opt,
                          const std::optional<double>& price_opt,
                          const std::optional<int>& stock_quantity_opt) {
        
        auto existing_product = getProductById(id);
        if (!existing_product) {
            throw NotFoundException("Product not found.");
        }

        std::string update_sql = "UPDATE products SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";
        std::vector<std::string> params_str; // For string parameters
        std::vector<double> params_double;   // For double parameters
        std::vector<int> params_int;         // For int parameters

        if (name_opt) {
            if (findByName(*name_opt) && findByName(*name_opt)->id != id) {
                throw ConflictException("Product with this name already exists.");
            }
            update_sql += ", name = ?";
            params_str.push_back(*name_opt);
        }
        if (description_opt) {
            update_sql += ", description = ?";
            params_str.push_back(*description_opt);
        }
        if (price_opt) {
            if (*price_opt < 0) {
                throw BadRequestException("Price cannot be negative.");
            }
            update_sql += ", price = ?";
            params_double.push_back(*price_opt);
        }
        if (stock_quantity_opt) {
            if (*stock_quantity_opt < 0) {
                throw BadRequestException("Stock quantity cannot be negative.");
            }
            update_sql += ", stock_quantity = ?";
            params_int.push_back(*stock_quantity_opt);
        }

        if (params_str.empty() && params_double.empty() && params_int.empty()) {
            return existing_product.value(); // No updates requested
        }

        update_sql += " WHERE id = ?";

        try {
            // Complex binding for dynamic types needs careful handling with SQLiteCpp.
            // A more generic approach would use a vector of boost::any or similar.
            // For simplicity, manually construct and bind for this example.
            SQLite::Statement stmt(*db.getConnection(), update_sql);
            int param_idx = 1;
            for (const auto& p : params_str)    { stmt.bind(param_idx++, p); }
            for (const auto& p : params_double) { stmt.bind(param_idx++, p); }
            for (const auto& p : params_int)    { stmt.bind(param_idx++, p); }
            stmt.bind(param_idx, id); // Bind the WHERE clause ID

            stmt.exec();
            db.releaseConnection(std::move(stmt.getDatabasePtr()));

            LOG_INFO("Product with ID {} updated.", id);
            Cache::app_cache.remove("product_" + std::to_string(id)); // Invalidate specific product cache
            Cache::app_cache.remove("all_products"); // Invalidate cache for all products
            return getProductById(id).value(); // Retrieve and return the updated product
        } catch (const ConflictException& e) {
            throw e;
        } catch (const InternalServerException& e) {
             LOG_ERROR("Failed to update product {}: {}", id, e.what());
             throw InternalServerException("Failed to update product.");
        }
    }

    /**
     * @brief Deletes a product by its ID.
     * @param id The ID of the product to delete.
     * @return True if the product was deleted, false otherwise.
     * @throws NotFoundException if the product does not exist.
     */
    bool deleteProduct(long long id) {
        if (!getProductById(id)) {
            throw NotFoundException("Product not found.");
        }
        try {
            int rows_affected = db.execute("DELETE FROM products WHERE id = ?", id);
            if (rows_affected > 0) {
                LOG_INFO("Product with ID {} deleted.", id);
                Cache::app_cache.remove("product_" + std::to_string(id)); // Invalidate specific product cache
                Cache::app_cache.remove("all_products"); // Invalidate cache for all products
                return true;
            }
            return false;
        } catch (const InternalServerException& e) {
            LOG_ERROR("Failed to delete product {}: {}", id, e.what());
            throw InternalServerException("Failed to delete product.");
        }
    }
};

#endif // PRODUCT_SERVICE_H