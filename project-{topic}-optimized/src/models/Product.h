#pragma once

#include <string>
#include <json/json.h>

namespace models {

struct Product {
    long long id = 0;
    std::string name;
    std::string description;
    double price = 0.0;
    int stockQuantity = 0;
    std::string createdAt;
    std::string updatedAt;

    Json::Value toJson() const {
        Json::Value productJson;
        productJson["id"] = id;
        productJson["name"] = name;
        productJson["description"] = description;
        productJson["price"] = price;
        productJson["stock_quantity"] = stockQuantity;
        productJson["created_at"] = createdAt;
        productJson["updated_at"] = updatedAt;
        return productJson;
    }

    static Product fromJson(const Json::Value& json) {
        Product product;
        if (json.isMember("id") && json["id"].isInt64()) {
            product.id = json["id"].asInt64();
        }
        if (json.isMember("name") && json["name"].isString()) {
            product.name = json["name"].asString();
        }
        if (json.isMember("description") && json["description"].isString()) {
            product.description = json["description"].asString();
        }
        if (json.isMember("price") && json["price"].isDouble()) {
            product.price = json["price"].asDouble();
        }
        if (json.isMember("stock_quantity") && json["stock_quantity"].isInt()) {
            product.stockQuantity = json["stock_quantity"].asInt();
        }
        if (json.isMember("created_at") && json["created_at"].isString()) {
            product.createdAt = json["created_at"].asString();
        }
        if (json.isMember("updated_at") && json["updated_at"].isString()) {
            product.updatedAt = json["updated_at"].asString();
        }
        return product;
    }
};

} // namespace models