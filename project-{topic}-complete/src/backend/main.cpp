```cpp
#include "crow.h"
#include "crow/json.h"
#include "db/db_manager.h"
#include "middleware/auth_middleware.h"
#include "middleware/error_middleware.h"
#include "middleware/logging_middleware.h"
#include "middleware/rate_limit_middleware.h"
#include "services/auth_service.h"
#include "services/product_service.h"
#include "services/order_service.h"
#include "utils/json_util.h"
#include "utils/env_loader.h"
#include "models/user.h" // For UserContext
#include <iostream>
#include <string>
#include <memory>
#include <stdexcept>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>

// Global database manager instance
std::unique_ptr<DBManager> g_db_manager;
std::unique_ptr<AuthService> g_auth_service;
std::unique_ptr<ProductService> g_product_service;
std::unique_ptr<OrderService> g_order_service;

void setup_logging() {
    auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    console_sink->set_level(spdlog::level::info);
    console_sink->set_formatter(std::make_unique<spdlog::pattern_formatter>("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v"));

    auto logger = std::make_shared<spdlog::logger>("ecommerce_logger", console_sink);
    logger->set_level(spdlog::level::debug); // Set global log level
    spdlog::set_default_logger(logger);
    spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
    spdlog::info("Logging initialized.");
}

int main() {
    setup_logging();

    // Load environment variables
    load_env();
    const std::string db_host = get_env("DB_HOST", "localhost");
    const std::string db_port = get_env("DB_PORT", "5432");
    const std::string db_name = get_env("DB_NAME", "ecommerce_db");
    const std::string db_user = get_env("DB_USER", "ecommerce_user");
    const std::string db_password = get_env("DB_PASSWORD", "ecommerce_password");
    const int app_port = std::stoi(get_env("APP_PORT", "8080"));
    const std::string jwt_secret = get_env("JWT_SECRET", "super_secret_jwt_key_at_least_32_chars_for_security");

    if (jwt_secret.length() < 32) {
        spdlog::warn("JWT_SECRET is less than 32 characters. Consider using a stronger secret in production.");
    }

    // Initialize DB Manager
    try {
        g_db_manager = std::make_unique<DBManager>(
            db_host, db_port, db_name, db_user, db_password
        );
        g_db_manager->connect();
        spdlog::info("Database connected successfully.");

        // Initialize services
        g_auth_service = std::make_unique<AuthService>(*g_db_manager, jwt_secret);
        g_product_service = std::make_unique<ProductService>(*g_db_manager);
        g_order_service = std::make_unique<OrderService>(*g_db_manager);

    } catch (const std::exception& e) {
        spdlog::critical("Failed to initialize database or services: {}", e.what());
        return 1;
    }

    crow::App<
        LoggingMiddleware,
        ErrorHandlingMiddleware,
        AuthMiddleware,
        RateLimitMiddleware // Rate limiting after auth, so authenticated users could have higher limits
    > app;

    // Set JWT Secret for AuthMiddleware
    app.get_middleware<AuthMiddleware>().set_jwt_secret(jwt_secret);

    // --- Health Check ---
    CROW_ROUTE(app, "/api/v1/health")
    ([]() {
        crow::json::wvalue x;
        x["status"] = "OK";
        return crow::response(200, x);
    });

    // --- Authentication Routes ---
    CROW_ROUTE(app, "/api/v1/auth/register").methods("POST"_method)
    ([&](const crow::request& req) {
        spdlog::info("Received register request from IP: {}", req.remote_ip_address);
        auto json_body = crow::json::load(req.body);
        if (!json_body) {
            throw BadRequestException("Invalid JSON body");
        }

        auto username = json_body["username"].s();
        auto email = json_body["email"].s();
        auto password = json_body["password"].s();

        if (username.empty() || email.empty() || password.empty()) {
            throw BadRequestException("Username, email, and password are required");
        }

        try {
            User user = g_auth_service->register_user(username, email, password);
            return crow::response(201, JsonUtil::to_json(user));
        } catch (const ConflictException& e) {
            throw ConflictException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/auth/login").methods("POST"_method)
    ([&](const crow::request& req) {
        spdlog::info("Received login request from IP: {}", req.remote_ip_address);
        auto json_body = crow::json::load(req.body);
        if (!json_body) {
            throw BadRequestException("Invalid JSON body");
        }

        auto email = json_body["email"].s();
        auto password = json_body["password"].s();

        if (email.empty() || password.empty()) {
            throw BadRequestException("Email and password are required");
        }

        try {
            auto result = g_auth_service->login_user(email, password);
            crow::json::wvalue x;
            x["token"] = result.first;
            x["user"] = JsonUtil::to_json(result.second);
            return crow::response(200, x);
        } catch (const UnauthorizedException& e) {
            throw UnauthorizedException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    // --- Product Routes ---
    CROW_ROUTE(app, "/api/v1/products").methods("GET"_method)
    ([&](const crow::request& req) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} ({}) retrieving product list.", user_context.user_id, user_context.user_role);

        std::string search_term = req.url_params.get("search") ? req.url_params.get("search") : "";
        int limit = req.url_params.get("limit") ? std::stoi(req.url_params.get("limit")) : 10;
        int offset = req.url_params.get("offset") ? std::stoi(req.url_params.get("offset")) : 0;

        try {
            auto products = g_product_service->get_all_products(search_term, limit, offset);
            crow::json::wvalue products_json = crow::json::wvalue::list();
            for (const auto& p : products) {
                products_json.push_back(JsonUtil::to_json(p));
            }
            return crow::response(200, products_json);
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/products/<int>").methods("GET"_method)
    ([&](const crow::request& req, int product_id) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} ({}) retrieving product ID: {}.", user_context.user_id, user_context.user_role, product_id);

        try {
            Product product = g_product_service->get_product_by_id(product_id);
            return crow::response(200, JsonUtil::to_json(product));
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/products").methods("POST"_method)
    ([&](const crow::request& req) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        if (user_context.user_role != "admin") {
            throw ForbiddenException("Only administrators can add products");
        }
        spdlog::info("Admin user {} adding new product.", user_context.user_id);

        auto json_body = crow::json::load(req.body);
        if (!json_body) {
            throw BadRequestException("Invalid JSON body");
        }

        Product new_product;
        new_product.name = json_body["name"].s();
        new_product.description = json_body["description"].s();
        new_product.price = json_body["price"].d();
        new_product.stock = json_body["stock"].i();
        new_product.image_url = json_body["image_url"].s();

        if (new_product.name.empty() || new_product.price < 0 || new_product.stock < 0) {
            throw BadRequestException("Invalid product data");
        }

        try {
            Product created_product = g_product_service->create_product(new_product);
            return crow::response(201, JsonUtil::to_json(created_product));
        } catch (const ConflictException& e) {
            throw ConflictException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/products/<int>").methods("PUT"_method)
    ([&](const crow::request& req, int product_id) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        if (user_context.user_role != "admin") {
            throw ForbiddenException("Only administrators can update products");
        }
        spdlog::info("Admin user {} updating product ID: {}.", user_context.user_id, product_id);

        auto json_body = crow::json::load(req.body);
        if (!json_body) {
            throw BadRequestException("Invalid JSON body");
        }

        Product updated_product_data;
        updated_product_data.id = product_id; // Ensure ID is set for update
        if (json_body.count("name")) updated_product_data.name = json_body["name"].s();
        if (json_body.count("description")) updated_product_data.description = json_body["description"].s();
        if (json_body.count("price")) updated_product_data.price = json_body["price"].d();
        if (json_body.count("stock")) updated_product_data.stock = json_body["stock"].i();
        if (json_body.count("image_url")) updated_product_data.image_url = json_body["image_url"].s();

        try {
            Product updated_product = g_product_service->update_product(updated_product_data);
            return crow::response(200, JsonUtil::to_json(updated_product));
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/products/<int>").methods("DELETE"_method)
    ([&](const crow::request& req, int product_id) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        if (user_context.user_role != "admin") {
            throw ForbiddenException("Only administrators can delete products");
        }
        spdlog::info("Admin user {} deleting product ID: {}.", user_context.user_id, product_id);

        try {
            g_product_service->delete_product(product_id);
            return crow::response(204); // No content
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    // --- Cart Routes ---
    CROW_ROUTE(app, "/api/v1/cart").methods("GET"_method)
    ([&](const crow::request& req) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} retrieving cart.", user_context.user_id);

        try {
            Cart cart = g_order_service->get_user_cart(user_context.user_id);
            return crow::response(200, JsonUtil::to_json(cart));
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/cart").methods("POST"_method)
    ([&](const crow::request& req) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} adding item to cart.", user_context.user_id);

        auto json_body = crow::json::load(req.body);
        if (!json_body) {
            throw BadRequestException("Invalid JSON body");
        }

        int product_id = json_body["product_id"].i();
        int quantity = json_body["quantity"].i();

        if (product_id <= 0 || quantity <= 0) {
            throw BadRequestException("Invalid product_id or quantity");
        }

        try {
            Cart cart = g_order_service->add_to_cart(user_context.user_id, product_id, quantity);
            return crow::response(200, JsonUtil::to_json(cart));
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const BadRequestException& e) { // For stock issues
            throw BadRequestException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/cart/items/<int>").methods("PUT"_method)
    ([&](const crow::request& req, int product_id) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} updating cart item for product ID: {}.", user_context.user_id, product_id);

        auto json_body = crow::json::load(req.body);
        if (!json_body) {
            throw BadRequestException("Invalid JSON body");
        }

        int quantity = json_body["quantity"].i();

        if (product_id <= 0 || quantity < 0) {
            throw BadRequestException("Invalid product_id or quantity");
        }

        try {
            Cart cart = g_order_service->update_cart_item_quantity(user_context.user_id, product_id, quantity);
            return crow::response(200, JsonUtil::to_json(cart));
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const BadRequestException& e) { // For stock issues
            throw BadRequestException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/cart/items/<int>").methods("DELETE"_method)
    ([&](const crow::request& req, int product_id) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} removing cart item for product ID: {}.", user_context.user_id, product_id);

        if (product_id <= 0) {
            throw BadRequestException("Invalid product_id");
        }

        try {
            g_order_service->remove_from_cart(user_context.user_id, product_id);
            return crow::response(204); // No content
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/cart").methods("DELETE"_method)
    ([&](const crow::request& req) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} clearing cart.", user_context.user_id);

        try {
            g_order_service->clear_cart(user_context.user_id);
            return crow::response(204); // No content
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });


    // --- Order Routes ---
    CROW_ROUTE(app, "/api/v1/orders").methods("POST"_method)
    ([&](const crow::request& req) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} placing order.", user_context.user_id);

        try {
            Order order = g_order_service->place_order(user_context.user_id);
            return crow::response(201, JsonUtil::to_json(order));
        } catch (const BadRequestException& e) {
            throw BadRequestException(e.what()); // E.g., empty cart, stock issues
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/orders").methods("GET"_method)
    ([&](const crow::request& req) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} retrieving order history.", user_context.user_id);

        try {
            auto orders = g_order_service->get_user_orders(user_context.user_id);
            crow::json::wvalue orders_json = crow::json::wvalue::list();
            for (const auto& o : orders) {
                orders_json.push_back(JsonUtil::to_json(o));
            }
            return crow::response(200, orders_json);
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });

    CROW_ROUTE(app, "/api/v1/orders/<int>").methods("GET"_method)
    ([&](const crow::request& req, int order_id) {
        AuthMiddleware::UserContext user_context = req.get_context<AuthMiddleware::UserContext>();
        if (!user_context.is_authenticated) {
            throw UnauthorizedException("Authentication required");
        }
        spdlog::info("User {} retrieving order ID: {}.", user_context.user_id, order_id);

        try {
            Order order = g_order_service->get_order_by_id(order_id, user_context.user_id);
            return crow::response(200, JsonUtil::to_json(order));
        } catch (const NotFoundException& e) {
            throw NotFoundException(e.what());
        } catch (const ForbiddenException& e) {
            throw ForbiddenException(e.what());
        } catch (const std::exception& e) {
            throw InternalServerErrorException(e.what());
        }
    });


    // Run the app
    spdlog::info("E-commerce backend starting on port {}", app_port);
    app.port(app_port).multithreaded().run();

    return 0;
}

```