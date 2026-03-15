#ifndef PRODUCT_H
#define PRODUCT_H

#include <string>
#include <ctime>
#include <crow.h>
#include <optional>

class Product {
public:
    long long id;
    std::string name;
    std::string description;
    double price;
    int stock_quantity;
    std::string created_at;
    std::string updated_at;

    Product() : id(0), price(0.0), stock_quantity(0) {} // Default constructor

    Product(long long id, const std::string& name, const std::string& description,
            double price, int stock_quantity, const std::string& created_at,
            const std::string& updated_at)
        : id(id), name(name), description(description), price(price),
          stock_quantity(stock_quantity), created_at(created_at), updated_at(updated_at) {}

    // Constructor for new products
    Product(const std::string& name, const std::string& description,
            double price, int stock_quantity)
        : id(0), name(name), description(description), price(price),
          stock_quantity(stock_quantity) {
        time_t rawtime;
        struct tm *timeinfo;
        char buffer[80];

        time(&rawtime);
        timeinfo = gmtime(&rawtime);
        strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
        created_at = buffer;
        updated_at = buffer;
    }

    crow::json::wvalue to_json() const {
        crow::json::wvalue json_obj;
        json_obj["id"] = id;
        json_obj["name"] = name;
        json_obj["description"] = description;
        json_obj["price"] = price;
        json_obj["stock_quantity"] = stock_quantity;
        json_obj["created_at"] = created_at;
        json_obj["updated_at"] = updated_at;
        return json_obj;
    }

    static std::optional<Product> from_json(const crow::json::rvalue& json, long long id = 0) {
        // Basic validation for creation
        if (!json.has("name") || !json.has("price") || !json.has("stock_quantity")) {
            return std::nullopt; // Required fields missing
        }

        Product product;
        product.id = id;
        product.name = json["name"].s();
        product.description = json.has("description") ? json["description"].s() : "";
        product.price = json["price"].d();
        product.stock_quantity = static_cast<int>(json["stock_quantity"].i());

        // Basic validation for numeric fields
        if (product.price < 0 || product.stock_quantity < 0) {
            return std::nullopt;
        }

        return product;
    }
};

#endif // PRODUCT_H