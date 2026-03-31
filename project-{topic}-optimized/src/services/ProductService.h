#pragma once

#include "repositories/ProductRepository.h"
#include "models/Product.h"
#include <string>
#include <optional>
#include <vector>
#include <memory>

namespace services {

class ProductService {
public:
    ProductService(std::shared_ptr<repositories::ProductRepository> productRepo);

    std::optional<models::Product> getProductById(long long productId);
    std::vector<models::Product> getAllProducts();
    long long createProduct(const models::Product& product);
    bool updateProduct(long long productId, const models::Product& product); // Product object with updated fields
    bool deleteProduct(long long productId);
    bool updateProductStock(long long productId, int quantityChange); // For inventory management

private:
    std::shared_ptr<repositories::ProductRepository> productRepo_;
};

} // namespace services