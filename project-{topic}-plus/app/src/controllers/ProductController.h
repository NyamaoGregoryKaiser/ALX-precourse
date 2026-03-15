#ifndef PRODUCT_CONTROLLER_H
#define PRODUCT_CONTROLLER_H

#include <crow.h>
#include "../services/ProductService.h"
#include "../utils/Logger.h"
#include "../utils/ErrorHandler.h"
#include "../utils/Middleware.h" // For AuthMiddleware context and helpers
#include "../app_config.h"

class ProductController {
private:
    ProductService& product_service;

public:
    ProductController(ProductService& product_svc) : product_service(product_svc) {
        LOG_INFO("ProductController initialized.");
    }

    /**
     * @brief Route to create a new product.
     * Requires ADMIN role.
     * POST /products
     */
    void createProduct(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
        try {
            require_role(ctx, AppConfig::ROLE_ADMIN);

            auto json = crow::json::load(req.body);
            if (!json) {
                throw BadRequestException("Invalid JSON in request body.");
            }

            auto product_opt = Product::from_json(json);
            if (!product_opt) {
                throw BadRequestException("Missing or invalid product data (name, price, stock_quantity required).");
            }
            Product new_product = product_opt.value();

            // Validate price and stock quantity directly from parsed values
            if (new_product.price < 0 || new_product.stock_quantity < 0) {
                throw BadRequestException("Price and stock quantity cannot be negative.");
            }

            Product created_product = product_service.createProduct(
                new_product.name,
                new_product.description,
                new_product.price,
                new_product.stock_quantity
            );

            res.code = crow::status::CREATED; // 201 Created
            res.set_header("Content-Type", "application/json");
            crow::json::wvalue resp_json;
            resp_json["message"] = "Product created successfully";
            resp_json["id"] = created_product.id;
            resp_json["name"] = created_product.name;
            resp_json["description"] = created_product.description;
            resp_json["price"] = created_product.price;
            resp_json["stock_quantity"] = created_product.stock_quantity;
            resp_json["created_at"] = created_product.created_at;
            resp_json["updated_at"] = created_product.updated_at;
            res.write(resp_json.dump());
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in createProduct: {}", e.what());
            throw InternalServerException("Failed to create product.");
        }
    }

    /**
     * @brief Route to get all products.
     * Requires authentication (USER or ADMIN).
     * GET /products
     */
    void getAllProducts(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
        try {
            require_auth(ctx); // Any authenticated user can view products

            std::vector<Product> products = product_service.getAllProducts();
            
            crow::json::wvalue products_json_array = crow::json::wvalue::list();
            for (const auto& product : products) {
                products_json_array.add(product.to_json());
            }

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(products_json_array.dump());
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in getAllProducts: {}", e.what());
            throw InternalServerException("Failed to retrieve products.");
        }
    }

    /**
     * @brief Route to get a product by ID.
     * Requires authentication (USER or ADMIN).
     * GET /products/{id}
     */
    void getProductById(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
        try {
            require_auth(ctx);

            auto product_opt = product_service.getProductById(id);
            if (!product_opt) {
                throw NotFoundException("Product not found.");
            }

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(product_opt->to_json().dump());
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in getProductById for id {}: {}", id, e.what());
            throw InternalServerException("Failed to retrieve product.");
        }
    }

    /**
     * @brief Route to update a product by ID.
     * Requires ADMIN role.
     * PUT /products/{id}
     */
    void updateProduct(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
        try {
            require_role(ctx, AppConfig::ROLE_ADMIN);

            auto json = crow::json::load(req.body);
            if (!json) {
                throw BadRequestException("Invalid JSON in request body.");
            }

            std::optional<std::string> name_opt;
            if (json.has("name")) {
                name_opt = json["name"].s();
                if (name_opt->empty()) throw BadRequestException("Product name cannot be empty.");
            }

            std::optional<std::string> description_opt;
            if (json.has("description")) {
                description_opt = json["description"].s();
            }

            std::optional<double> price_opt;
            if (json.has("price")) {
                price_opt = json["price"].d();
                if (*price_opt < 0) throw BadRequestException("Price cannot be negative.");
            }

            std::optional<int> stock_quantity_opt;
            if (json.has("stock_quantity")) {
                stock_quantity_opt = static_cast<int>(json["stock_quantity"].i());
                if (*stock_quantity_opt < 0) throw BadRequestException("Stock quantity cannot be negative.");
            }

            Product updated_product = product_service.updateProduct(
                id, name_opt, description_opt, price_opt, stock_quantity_opt
            );

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            crow::json::wvalue resp_json;
            resp_json["message"] = "Product updated successfully";
            resp_json["id"] = updated_product.id;
            resp_json["name"] = updated_product.name;
            resp_json["description"] = updated_product.description;
            resp_json["price"] = updated_product.price;
            resp_json["stock_quantity"] = updated_product.stock_quantity;
            resp_json["created_at"] = updated_product.created_at;
            resp_json["updated_at"] = updated_product.updated_at;
            res.write(resp_json.dump());
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in updateProduct for id {}: {}", id, e.what());
            throw InternalServerException("Failed to update product.");
        }
    }

    /**
     * @brief Route to delete a product by ID.
     * Requires ADMIN role.
     * DELETE /products/{id}
     */
    void deleteProduct(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
        try {
            require_role(ctx, AppConfig::ROLE_ADMIN);

            if (product_service.deleteProduct(id)) {
                res.code = crow::status::NO_CONTENT; // 204 No Content
            } else {
                throw NotFoundException("Product not found or already deleted.");
            }
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in deleteProduct for id {}: {}", id, e.what());
            throw InternalServerException("Failed to delete product.");
        }
    }
};

#endif // PRODUCT_CONTROLLER_H