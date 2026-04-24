```cpp
#include "order_service.h"

OrderService::OrderService(DBManager& db_manager)
    : db_manager_(db_manager), logger_(spdlog::get("ecommerce_logger")) {
    if (!logger_) {
        logger_ = spdlog::stdout_color_mt("order_service_logger");
    }
}

// --- Cart Operations ---
Cart OrderService::get_user_cart(int user_id) {
    std::optional<Cart> cart_opt = db_manager_.get_user_cart_with_items(user_id);
    if (!cart_opt) {
        // If no cart exists, create one (implicitly handled by db_manager or explicitly here)
        return db_manager_.get_or_create_user_cart(user_id);
    }
    logger_->info("User {} retrieved cart ID: {}", user_id, cart_opt->id);
    return cart_opt.value();
}

Cart OrderService::add_to_cart(int user_id, int product_id, int quantity) {
    if (product_id <= 0 || quantity <= 0) {
        throw BadRequestException("Product ID and quantity must be positive.");
    }

    // Start transaction for atomicity
    pqxx::work tx = db_manager_.begin_transaction();
    try {
        Cart cart = db_manager_.get_or_create_user_cart(user_id);
        std::optional<Product> product_opt = db_manager_.get_product_by_id(product_id); // This will fetch from cache if available
        if (!product_opt) {
            throw NotFoundException("Product with ID " + std::to_string(product_id) + " not found.");
        }
        Product product = product_opt.value();

        // Check if adding this quantity exceeds available stock
        // This requires getting current cart quantity for the product
        std::optional<Cart> current_cart_opt = db_manager_.get_user_cart_with_items(user_id);
        int current_cart_qty = 0;
        if (current_cart_opt) {
            for (const auto& item : current_cart_opt->items) {
                if (item.product_id == product_id) {
                    current_cart_qty = item.quantity;
                    break;
                }
            }
        }

        if (current_cart_qty + quantity > product.stock) {
            throw BadRequestException("Cannot add " + std::to_string(quantity) + " units. Only " + std::to_string(product.stock - current_cart_qty) + " units available.");
        }

        db_manager_.add_or_update_cart_item(cart.id, product_id, quantity);
        tx.commit();
        logger_->info("User {} added/updated product {} in cart (qty {}).", user_id, product_id, quantity);
        return get_user_cart(user_id); // Retrieve updated cart
    } catch (const std::exception& e) {
        tx.abort();
        logger_->error("Failed to add to cart for user {}: {}", user_id, e.what());
        throw;
    }
}

Cart OrderService::update_cart_item_quantity(int user_id, int product_id, int quantity) {
    if (product_id <= 0 || quantity < 0) {
        throw BadRequestException("Product ID must be positive, quantity non-negative.");
    }

    pqxx::work tx = db_manager_.begin_transaction();
    try {
        Cart cart = db_manager_.get_or_create_user_cart(user_id);
        std::optional<Product> product_opt = db_manager_.get_product_by_id(product_id);
        if (!product_opt) {
            throw NotFoundException("Product with ID " + std::to_string(product_id) + " not found.");
        }
        Product product = product_opt.value();

        // Check if updating to this quantity exceeds available stock
        if (quantity > product.stock) {
            throw BadRequestException("Cannot update to " + std::to_string(quantity) + " units. Only " + std::to_string(product.stock) + " units available.");
        }

        if (quantity == 0) {
            db_manager_.remove_cart_item(cart.id, product_id);
            logger_->info("User {} removed product {} from cart.", user_id, product_id);
        } else {
            // Get current quantity in cart to calculate delta for stock check
            int current_cart_qty = 0;
            std::optional<Cart> current_cart_opt = db_manager_.get_user_cart_with_items(user_id);
            if (current_cart_opt) {
                for (const auto& item : current_cart_opt->items) {
                    if (item.product_id == product_id) {
                        current_cart_qty = item.quantity;
                        break;
                    }
                }
            }

            // This is an update, not an add. So we need to calculate the difference.
            // The `add_or_update_cart_item` does `quantity = quantity + EXCLUDED.quantity`.
            // For a direct `SET quantity`, we need a different DB function.
            std::string update_query = "UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3 RETURNING id;";
            pqxx::result r = tx.exec_params(update_query, pqxx::placeholders(quantity, cart.id, product_id));
            if (r.empty()) {
                throw NotFoundException("Product ID " + std::to_string(product_id) + " not found in cart " + std::to_string(cart.id));
            }
            logger_->info("User {} updated product {} in cart to quantity {}.", user_id, product_id, quantity);
        }
        tx.commit();
        return get_user_cart(user_id);
    } catch (const std::exception& e) {
        tx.abort();
        logger_->error("Failed to update cart item for user {}: {}", user_id, e.what());
        throw;
    }
}


void OrderService::remove_from_cart(int user_id, int product_id) {
    if (product_id <= 0) {
        throw BadRequestException("Product ID must be positive.");
    }
    pqxx::work tx = db_manager_.begin_transaction();
    try {
        Cart cart = db_manager_.get_or_create_user_cart(user_id);
        db_manager_.remove_cart_item(cart.id, product_id);
        tx.commit();
        logger_->info("User {} removed product {} from cart.", user_id, product_id);
    } catch (const std::exception& e) {
        tx.abort();
        logger_->error("Failed to remove from cart for user {}: {}", user_id, e.what());
        throw;
    }
}

void OrderService::clear_cart(int user_id) {
    pqxx::work tx = db_manager_.begin_transaction();
    try {
        Cart cart = db_manager_.get_or_create_user_cart(user_id);
        db_manager_.clear_cart_items(cart.id, tx);
        tx.commit();
        logger_->info("User {} cleared cart ID: {}.", user_id, cart.id);
    } catch (const std::exception& e) {
        tx.abort();
        logger_->error("Failed to clear cart for user {}: {}", user_id, e.what());
        throw;
    }
}

// --- Order Operations ---
Order OrderService::place_order(int user_id) {
    pqxx::work tx = db_manager_.begin_transaction();
    try {
        std::optional<Cart> cart_opt = db_manager_.get_user_cart_with_items(user_id);
        if (!cart_opt || cart_opt->items.empty()) {
            throw BadRequestException("Cannot place order with an empty cart.");
        }
        Cart cart = cart_opt.value();

        double total_amount = 0.0;
        std::vector<OrderItem> order_items;

        for (const auto& cart_item : cart.items) {
            std::optional<Product> product_opt = db_manager_.get_product_by_id(cart_item.product_id);
            if (!product_opt) {
                throw NotFoundException("Product ID " + std::to_string(cart_item.product_id) + " not found while placing order.");
            }
            Product product = product_opt.value();

            if (product.stock < cart_item.quantity) {
                throw BadRequestException("Insufficient stock for product " + product.name + ". Only " + std::to_string(product.stock) + " available.");
            }

            // Decrease stock
            db_manager_.decrease_product_stock(product.id, cart_item.quantity, tx);

            OrderItem order_item;
            order_item.product_id = product.id;
            order_item.product_name = product.name; // Store name for snapshot
            order_item.quantity = cart_item.quantity;
            order_item.price = product.price; // Use current product price
            total_amount += order_item.quantity * order_item.price;
            order_items.push_back(order_item);
        }

        // Create the order
        Order new_order = db_manager_.create_order(user_id, total_amount, OrderStatus::PENDING, tx);

        // Create order items
        for (const auto& item : order_items) {
            db_manager_.create_order_item(new_order.id, item.product_id, item.quantity, item.price, tx);
        }

        // Clear the user's cart
        db_manager_.clear_cart_items(cart.id, tx);

        tx.commit();
        logger_->info("Order placed successfully for user {}: Order ID = {}", user_id, new_order.id);
        return new_order;
    } catch (const std::exception& e) {
        tx.abort();
        logger_->error("Failed to place order for user {}: {}", user_id, e.what());
        throw;
    }
}

std::vector<Order> OrderService::get_user_orders(int user_id) {
    std::vector<Order> orders = db_manager_.get_user_orders(user_id);
    for (auto& order : orders) {
        order.items = db_manager_.get_order_items(order.id);
    }
    logger_->info("User {} retrieved {} orders.", user_id, orders.size());
    return orders;
}

Order OrderService::get_order_by_id(int order_id, int user_id) {
    std::optional<Order> order_opt = db_manager_.get_order_by_id(order_id);
    if (!order_opt) {
        throw NotFoundException("Order with ID " + std::to_string(order_id) + " not found.");
    }

    Order order = order_opt.value();
    if (order.user_id != user_id) {
        throw ForbiddenException("Access denied. Order with ID " + std::to_string(order_id) + " does not belong to user " + std::to_string(user_id));
    }
    logger_->info("User {} retrieved order ID: {}", user_id, order_id);
    return order;
}
```