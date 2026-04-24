```cpp
#ifndef ECOMMERCE_PRODUCT_H
#define ECOMMERCE_PRODUCT_H

#include <string>
#include <chrono>

struct Product {
    int id;
    std::string name;
    std::string description;
    double price;
    int stock;
    std::string image_url;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    Product() : id(0), price(0.0), stock(0), created_at(), updated_at() {}
};

#endif // ECOMMERCE_PRODUCT_H
```