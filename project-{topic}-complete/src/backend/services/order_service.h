```cpp
#ifndef ECOMMERCE_ORDER_SERVICE_H
#define ECOMMERCE_ORDER_SERVICE_H

#include "../db/db_manager.h"
#include "../models/order.h"
#include "../models/cart.h"
#include "../models/product.h"
#include "../middleware/error_middleware.h" // For custom exceptions
#include <string>
#include <vector>
#include <optional>
#include <spdlog/spdlog.h>

class OrderService {
public:
    OrderService(DBManager& db_manager);

    // Cart Operations
    Cart get_user_cart(int user_id);
    Cart add_to_cart(int user_id, int product_id, int quantity);
    Cart update_cart_item_quantity(int user_id, int product_id, int quantity);
    void remove_from_cart(int user_id, int product_id);
    void clear_cart(int user_id);

    // Order Operations
    Order place_order(int user_id);
    std::vector<Order> get_user_orders(int user_id);
    Order get_order_by_id(int order_id, int user_id);

private:
    DBManager& db_manager_;
    std::shared_ptr<spdlog::logger> logger_;
};

#endif // ECOMMERCE_ORDER_SERVICE_H
```