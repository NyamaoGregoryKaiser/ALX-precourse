```cpp
#include <iostream>
#include <string>
#include <vector>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include "../backend/utils/json_util.h" // For deserializing JSON into models
#include "../backend/models/user.h"
#include "../backend/models/product.h"
#include "../backend/models/cart.h"
#include "../backend/models/order.h"
#include <limits> // For numeric_limits
#include <memory> // For std::unique_ptr

// Globals for convenience in a simple client
const std::string BASE_URL = "http://localhost:8080/api/v1";
std::string JWT_TOKEN = "";
User CURRENT_USER;

// Callback function for libcurl to write received data
size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

// Helper function for making HTTP requests
nlohmann::json make_request(const std::string& method, const std::string& url,
                            const std::string& body = "", const std::string& token = "") {
    CURL* curl;
    CURLcode res;
    std::string read_buffer;

    curl = curl_easy_init();
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &read_buffer);

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        if (!token.empty()) {
            std::string auth_header = "Authorization: Bearer " + token;
            headers = curl_slist_append(headers, auth_header.c_str());
        }
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        if (method == "POST") {
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        } else if (method == "PUT") {
            curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        } else if (method == "DELETE") {
            curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
        }

        res = curl_easy_perform(curl);
        long http_code = 0;
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

        if (res != CURLE_OK) {
            std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
            curl_easy_cleanup(curl);
            curl_slist_free_all(headers);
            return nlohmann::json::parse(R"({"message": "Network error or API unavailable", "code": 500})");
        }

        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);

        if (read_buffer.empty() && (http_code == 204 || http_code == 200)) { // No Content, but success
            return nlohmann::json::parse(R"({"message": "Operation successful", "code": )" + std::to_string(http_code) + "}");
        }

        try {
            nlohmann::json json_response = nlohmann::json::parse(read_buffer);
            json_response["http_code"] = http_code; // Add HTTP status code to JSON
            return json_response;
        } catch (const nlohmann::json::parse_error& e) {
            std::cerr << "JSON parse error: " << e.what() << std::endl;
            return nlohmann::json::parse(R"({"message": "Invalid JSON response from server", "code": )" + std::to_string(http_code) + "}");
        }
    }
    return nlohmann::json::parse(R"({"message": "Curl initialization failed", "code": 500})");
}

// --- Auth Functions ---
void register_user() {
    std::string username, email, password;
    std::cout << "\n--- Register New User ---" << std::endl;
    std::cout << "Enter username: ";
    std::getline(std::cin, username);
    std::cout << "Enter email: ";
    std::getline(std::cin, email);
    std::cout << "Enter password: ";
    std::getline(std::cin, password);

    nlohmann::json req_body;
    req_body["username"] = username;
    req_body["email"] = email;
    req_body["password"] = password;

    nlohmann::json res = make_request("POST", BASE_URL + "/auth/register", req_body.dump());
    if (res["http_code"] == 201) {
        std::cout << "Registration successful! User ID: " << res["id"] << ", Role: " << res["role"] << std::endl;
    } else {
        std::cout << "Registration failed: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

bool login_user() {
    std::string email, password;
    std::cout << "\n--- Login User ---" << std::endl;
    std::cout << "Enter email: ";
    std::getline(std::cin, email);
    std::cout << "Enter password: ";
    std::getline(std::cin, password);

    nlohmann::json req_body;
    req_body["email"] = email;
    req_body["password"] = password;

    nlohmann::json res = make_request("POST", BASE_URL + "/auth/login", req_body.dump());
    if (res["http_code"] == 200) {
        JWT_TOKEN = res["token"].get<std::string>();
        CURRENT_USER.id = res["user"]["id"].get<int>();
        CURRENT_USER.username = res["user"]["username"].get<std::string>();
        CURRENT_USER.email = res["user"]["email"].get<std::string>();
        CURRENT_USER.role = string_to_user_role(res["user"]["role"].get<std::string>());
        std::cout << "Login successful! Welcome, " << CURRENT_USER.username << " (" << user_role_to_string(CURRENT_USER.role) << ")" << std::endl;
        return true;
    } else {
        std::cout << "Login failed: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
        JWT_TOKEN = "";
        CURRENT_USER = User(); // Reset user info
        return false;
    }
}

void logout_user() {
    JWT_TOKEN = "";
    CURRENT_USER = User();
    std::cout << "Logged out successfully." << std::endl;
}

// --- Product Functions ---
void list_products() {
    std::cout << "\n--- Product List ---" << std::endl;
    std::cout << "Enter search term (leave empty for all): ";
    std::string search_term;
    std::getline(std::cin, search_term);

    std::string url = BASE_URL + "/products";
    if (!search_term.empty()) {
        url += "?search=" + search_term;
    }

    nlohmann::json res = make_request("GET", url, "", JWT_TOKEN);
    if (res["http_code"] == 200 && res.is_array()) {
        if (res.empty()) {
            std::cout << "No products found." << std::endl;
            return;
        }
        std::cout << "ID\tName\t\tPrice\tStock" << std::endl;
        std::cout << "----------------------------------------------------" << std::endl;
        for (const auto& p_json : res) {
            std::cout << p_json["id"] << "\t" << p_json["name"].get<std::string>().substr(0,15) << (p_json["name"].get<std::string>().length() > 15 ? "..." : "") << "\t"
                      << p_json["price"] << "\t" << p_json["stock"] << std::endl;
        }
    } else {
        std::cout << "Failed to list products: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void get_product_details() {
    std::cout << "\n--- Product Details ---" << std::endl;
    std::cout << "Enter Product ID: ";
    int product_id;
    std::cin >> product_id;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer

    std::string url = BASE_URL + "/products/" + std::to_string(product_id);
    nlohmann::json res = make_request("GET", url, "", JWT_TOKEN);
    if (res["http_code"] == 200) {
        std::cout << "ID: " << res["id"] << std::endl;
        std::cout << "Name: " << res["name"] << std::endl;
        std::cout << "Description: " << res["description"] << std::endl;
        std::cout << "Price: " << res["price"] << std::endl;
        std::cout << "Stock: " << res["stock"] << std::endl;
        std::cout << "Image URL: " << res["image_url"] << std::endl;
    } else {
        std::cout << "Failed to get product details: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void add_product() {
    if (CURRENT_USER.role != UserRole::ADMIN) {
        std::cout << "Error: Only administrators can add products." << std::endl;
        return;
    }

    std::cout << "\n--- Add New Product ---" << std::endl;
    std::string name, description, image_url;
    double price;
    int stock;

    std::cout << "Enter Name: ";
    std::getline(std::cin, name);
    std::cout << "Enter Description: ";
    std::getline(std::cin, description);
    std::cout << "Enter Price: ";
    std::cin >> price;
    std::cout << "Enter Stock: ";
    std::cin >> stock;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer
    std::cout << "Enter Image URL (optional): ";
    std::getline(std::cin, image_url);

    nlohmann::json req_body;
    req_body["name"] = name;
    req_body["description"] = description;
    req_body["price"] = price;
    req_body["stock"] = stock;
    req_body["image_url"] = image_url;

    nlohmann::json res = make_request("POST", BASE_URL + "/products", req_body.dump(), JWT_TOKEN);
    if (res["http_code"] == 201) {
        std::cout << "Product added successfully! ID: " << res["id"] << ", Name: " << res["name"] << std::endl;
    } else {
        std::cout << "Failed to add product: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void update_product() {
    if (CURRENT_USER.role != UserRole::ADMIN) {
        std::cout << "Error: Only administrators can update products." << std::endl;
        return;
    }

    std::cout << "\n--- Update Product ---" << std::endl;
    std::cout << "Enter Product ID to update: ";
    int product_id;
    std::cin >> product_id;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer

    std::cout << "Enter new Name (leave empty to keep current): ";
    std::string name;
    std::getline(std::cin, name);
    std::cout << "Enter new Description (leave empty to keep current): ";
    std::string description;
    std::getline(std::cin, description);
    std::cout << "Enter new Price (0 to skip): ";
    double price;
    std::cin >> price;
    std::cout << "Enter new Stock (-1 to skip): ";
    int stock;
    std::cin >> stock;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer
    std::cout << "Enter new Image URL (leave empty to keep current): ";
    std::string image_url;
    std::getline(std::cin, image_url);

    nlohmann::json req_body;
    if (!name.empty()) req_body["name"] = name;
    if (!description.empty()) req_body["description"] = description;
    if (price > 0) req_body["price"] = price;
    if (stock >= 0) req_body["stock"] = stock;
    if (!image_url.empty()) req_body["image_url"] = image_url;

    if (req_body.empty()) {
        std::cout << "No fields provided for update. Skipping." << std::endl;
        return;
    }

    std::string url = BASE_URL + "/products/" + std::to_string(product_id);
    nlohmann::json res = make_request("PUT", url, req_body.dump(), JWT_TOKEN);
    if (res["http_code"] == 200) {
        std::cout << "Product updated successfully! ID: " << res["id"] << ", Name: " << res["name"] << std::endl;
    } else {
        std::cout << "Failed to update product: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void delete_product() {
    if (CURRENT_USER.role != UserRole::ADMIN) {
        std::cout << "Error: Only administrators can delete products." << std::endl;
        return;
    }

    std::cout << "\n--- Delete Product ---" << std::endl;
    std::cout << "Enter Product ID to delete: ";
    int product_id;
    std::cin >> product_id;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer

    std::string url = BASE_URL + "/products/" + std::to_string(product_id);
    nlohmann::json res = make_request("DELETE", url, "", JWT_TOKEN);
    if (res["http_code"] == 204) {
        std::cout << "Product ID " << product_id << " deleted successfully." << std::endl;
    } else {
        std::cout << "Failed to delete product: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}


// --- Cart Functions ---
void view_cart() {
    std::cout << "\n--- Your Shopping Cart ---" << std::endl;
    nlohmann::json res = make_request("GET", BASE_URL + "/cart", "", JWT_TOKEN);
    if (res["http_code"] == 200) {
        if (res.contains("items") && res["items"].is_array() && !res["items"].empty()) {
            std::cout << "Product ID\tName\t\tPrice\tQuantity" << std::endl;
            std::cout << "---------------------------------------------------------" << std::endl;
            double total_cart_value = 0.0;
            for (const auto& item : res["items"]) {
                std::cout << item["product_id"] << "\t\t" << item["name"].get<std::string>().substr(0,15) << (item["name"].get<std::string>().length() > 15 ? "..." : "") << "\t"
                          << item["price"] << "\t" << item["quantity"] << std::endl;
                total_cart_value += item["price"].get<double>() * item["quantity"].get<int>();
            }
            std::cout << "---------------------------------------------------------" << std::endl;
            std::cout << "Total Cart Value: $" << std::fixed << std::setprecision(2) << total_cart_value << std::endl;
        } else {
            std::cout << "Your cart is empty." << std::endl;
        }
    } else {
        std::cout << "Failed to view cart: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void add_to_cart() {
    std::cout << "\n--- Add Item to Cart ---" << std::endl;
    std::cout << "Enter Product ID: ";
    int product_id;
    std::cin >> product_id;
    std::cout << "Enter Quantity: ";
    int quantity;
    std::cin >> quantity;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer

    nlohmann::json req_body;
    req_body["product_id"] = product_id;
    req_body["quantity"] = quantity;

    nlohmann::json res = make_request("POST", BASE_URL + "/cart", req_body.dump(), JWT_TOKEN);
    if (res["http_code"] == 200) {
        std::cout << "Item added/updated in cart successfully." << std::endl;
        view_cart();
    } else {
        std::cout << "Failed to add to cart: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void update_cart_item() {
    std::cout << "\n--- Update Cart Item Quantity ---" << std::endl;
    std::cout << "Enter Product ID to update: ";
    int product_id;
    std::cin >> product_id;
    std::cout << "Enter new Quantity (0 to remove): ";
    int quantity;
    std::cin >> quantity;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer

    nlohmann::json req_body;
    req_body["quantity"] = quantity;

    std::string url = BASE_URL + "/cart/items/" + std::to_string(product_id);
    nlohmann::json res = make_request("PUT", url, req_body.dump(), JWT_TOKEN);
    if (res["http_code"] == 200) {
        std::cout << "Cart item quantity updated successfully." << std::endl;
        view_cart();
    } else {
        std::cout << "Failed to update cart item: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void remove_from_cart() {
    std::cout << "\n--- Remove Item from Cart ---" << std::endl;
    std::cout << "Enter Product ID to remove: ";
    int product_id;
    std::cin >> product_id;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer

    std::string url = BASE_URL + "/cart/items/" + std::to_string(product_id);
    nlohmann::json res = make_request("DELETE", url, "", JWT_TOKEN);
    if (res["http_code"] == 204) {
        std::cout << "Item removed from cart successfully." << std::endl;
        view_cart();
    } else {
        std::cout << "Failed to remove item from cart: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void clear_cart() {
    std::cout << "\n--- Clear Cart ---" << std::endl;
    std::cout << "Are you sure you want to clear your cart? (y/N): ";
    std::string confirmation;
    std::getline(std::cin, confirmation);

    if (confirmation == "y" || confirmation == "Y") {
        nlohmann::json res = make_request("DELETE", BASE_URL + "/cart", "", JWT_TOKEN);
        if (res["http_code"] == 204) {
            std::cout << "Cart cleared successfully." << std::endl;
        } else {
            std::cout << "Failed to clear cart: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
        }
    } else {
        std::cout << "Cart clear cancelled." << std::endl;
    }
}

// --- Order Functions ---
void place_order() {
    std::cout << "\n--- Place Order ---" << std::endl;
    view_cart(); // Show current cart before placing order
    std::cout << "Proceed to checkout? (y/N): ";
    std::string confirmation;
    std::getline(std::cin, confirmation);

    if (confirmation == "y" || confirmation == "Y") {
        nlohmann::json res = make_request("POST", BASE_URL + "/orders", "", JWT_TOKEN);
        if (res["http_code"] == 201) {
            std::cout << "Order placed successfully! Order ID: " << res["id"] << ", Total: " << res["total_amount"] << std::endl;
        } else {
            std::cout << "Failed to place order: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
        }
    } else {
        std::cout << "Order placement cancelled." << std::endl;
    }
}

void view_orders() {
    std::cout << "\n--- Your Orders ---" << std::endl;
    nlohmann::json res = make_request("GET", BASE_URL + "/orders", "", JWT_TOKEN);
    if (res["http_code"] == 200 && res.is_array()) {
        if (res.empty()) {
            std::cout << "You have no orders." << std::endl;
            return;
        }
        std::cout << "ID\tTotal Amount\tStatus\t\tDate" << std::endl;
        std::cout << "----------------------------------------------------" << std::endl;
        for (const auto& o_json : res) {
            std::cout << o_json["id"] << "\t" << std::fixed << std::setprecision(2) << o_json["total_amount"] << "\t\t"
                      << o_json["status"] << "\t\t" << o_json["created_at"].get<std::string>().substr(0, 10) << std::endl;
        }
    } else {
        std::cout << "Failed to view orders: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}

void get_order_details() {
    std::cout << "\n--- Order Details ---" << std::endl;
    std::cout << "Enter Order ID: ";
    int order_id;
    std::cin >> order_id;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer

    std::string url = BASE_URL + "/orders/" + std::to_string(order_id);
    nlohmann::json res = make_request("GET", url, "", JWT_TOKEN);
    if (res["http_code"] == 200) {
        std::cout << "Order ID: " << res["id"] << std::endl;
        std::cout << "User ID: " << res["user_id"] << std::endl;
        std::cout << "Total Amount: " << std::fixed << std::setprecision(2) << res["total_amount"] << std::endl;
        std::cout << "Status: " << res["status"] << std::endl;
        std::cout << "Created At: " << res["created_at"] << std::endl;
        std::cout << "Items:" << std::endl;
        if (res.contains("items") && res["items"].is_array() && !res["items"].empty()) {
            std::cout << "  Product ID\tName\t\tQty\tPrice" << std::endl;
            std::cout << "  -------------------------------------------------" << std::endl;
            for (const auto& item : res["items"]) {
                std::cout << "  " << item["product_id"] << "\t\t" << item["name"].get<std::string>().substr(0,15) << (item["name"].get<std::string>().length() > 15 ? "..." : "") << "\t"
                          << item["quantity"] << "\t" << item["price"] << std::endl;
            }
        } else {
            std::cout << "  No items found for this order." << std::endl;
        }
    } else {
        std::cout << "Failed to get order details: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
    }
}


// --- Main Menu and Program Flow ---
void display_guest_menu() {
    std::cout << "\n--- Guest Menu ---" << std::endl;
    std::cout << "1. Register" << std::endl;
    std::cout << "2. Login" << std::endl;
    std::cout << "3. Health Check" << std::endl;
    std::cout << "0. Exit" << std::endl;
    std::cout << "Choose an option: ";
}

void display_user_menu() {
    std::cout << "\n--- User Menu (" << CURRENT_USER.username << " - " << user_role_to_string(CURRENT_USER.role) << ") ---" << std::endl;
    std::cout << "1. List Products" << std::endl;
    std::cout << "2. View Product Details" << std::endl;
    std::cout << "3. View Cart" << std::endl;
    std::cout << "4. Add Item to Cart" << std::endl;
    std::cout << "5. Update Cart Item Quantity" << std::endl;
    std::cout << "6. Remove Item from Cart" << std::endl;
    std::cout << "7. Clear Cart" << std::endl;
    std::cout << "8. Place Order" << std::endl;
    std::cout << "9. View Orders" << std::endl;
    std::cout << "10. View Order Details" << std::endl;
    if (CURRENT_USER.role == UserRole::ADMIN) {
        std::cout << "--- Admin Options ---" << std::endl;
        std::cout << "11. Add Product" << std::endl;
        std::cout << "12. Update Product" << std::endl;
        std::cout << "13. Delete Product" << std::endl;
    }
    std::cout << "0. Logout" << std::endl;
    std::cout << "Choose an option: ";
}

void handle_guest_choice(int choice) {
    switch (choice) {
        case 1: register_user(); break;
        case 2: login_user(); break;
        case 3: {
            nlohmann::json res = make_request("GET", BASE_URL + "/health");
            if (res["http_code"] == 200) {
                std::cout << "Health Check: " << res["status"] << std::endl;
            } else {
                std::cout << "Health Check Failed: " << res["message"] << " (Code: " << res["code"] << ")" << std::endl;
            }
            break;
        }
        case 0: std::cout << "Exiting..." << std::endl; break;
        default: std::cout << "Invalid choice. Please try again." << std::endl; break;
    }
}

void handle_user_choice(int choice) {
    switch (choice) {
        case 1: list_products(); break;
        case 2: get_product_details(); break;
        case 3: view_cart(); break;
        case 4: add_to_cart(); break;
        case 5: update_cart_item(); break;
        case 6: remove_from_cart(); break;
        case 7: clear_cart(); break;
        case 8: place_order(); break;
        case 9: view_orders(); break;
        case 10: get_order_details(); break;
        case 11:
            if (CURRENT_USER.role == UserRole::ADMIN) add_product();
            else std::cout << "Invalid choice. Please try again." << std::endl;
            break;
        case 12:
            if (CURRENT_USER.role == UserRole::ADMIN) update_product();
            else std::cout << "Invalid choice. Please try again." << std::endl;
            break;
        case 13:
            if (CURRENT_USER.role == UserRole::ADMIN) delete_product();
            else std::cout << "Invalid choice. Please try again." << std::endl;
            break;
        case 0: logout_user(); break;
        default: std::cout << "Invalid choice. Please try again." << std::endl; break;
    }
}


int main() {
    curl_global_init(CURL_GLOBAL_DEFAULT);
    std::cout << "Welcome to the C++ E-commerce Client!" << std::endl;

    int choice;
    while (true) {
        if (JWT_TOKEN.empty()) {
            display_guest_menu();
            if (!(std::cin >> choice)) {
                std::cout << "Invalid input. Please enter a number." << std::endl;
                std::cin.clear();
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
                continue;
            }
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer
            if (choice == 0) break;
            handle_guest_choice(choice);
        } else {
            display_user_menu();
            if (!(std::cin >> choice)) {
                std::cout << "Invalid input. Please enter a number." << std::endl;
                std::cin.clear();
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
                continue;
            }
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Clear buffer
            if (choice == 0) {
                logout_user();
                continue;
            }
            handle_user_choice(choice);
        }
    }

    curl_global_cleanup();
    return 0;
}
```