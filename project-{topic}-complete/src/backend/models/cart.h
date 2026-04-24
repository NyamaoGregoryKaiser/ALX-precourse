```cpp
#ifndef ECOMMERCE_CART_H
#define ECOMMERCE_CART_H

#include <string>
#include <vector>
#include <chrono>

struct CartItem {
    int id;
    int cart_id;
    int product_id;
    std::string product_name; // To display in cart
    double product_price;     // To display in cart
    int quantity;

    CartItem() : id(0), cart_id(0), product_id(0), product_price(0.0), quantity(0) {}
};

struct Cart {
    int id;
    int user_id;
    std::vector<CartItem> items;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    Cart() : id(0), user_id(0), created_at(), updated_at() {}
};

#endif // ECOMMERCE_CART_H
```