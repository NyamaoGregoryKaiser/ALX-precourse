#pragma once

#include <drogon/drogon.h>
#include "models/Product.h"
#include <optional>
#include <vector>

namespace repositories {

class ProductRepository {
public:
    explicit ProductRepository(drogon::orm::DbClientPtr dbClient);

    std::optional<models::Product> findById(long long id);
    std::vector<models::Product> findAll();
    long long create(const models::Product& product);
    bool update(const models::Product& product);
    bool remove(long long id);
    bool updateStock(long long productId, int quantityChange); // quantityChange can be negative
    std::optional<int> getStock(long long productId);

private:
    drogon::orm::DbClientPtr dbClient_;
};

} // namespace repositories