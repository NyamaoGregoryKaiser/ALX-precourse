```cpp
#include "ErrorHandler.hpp"

crow::response handle_exception(const CustomException& e) {
    nlohmann::json error_json;
    error_json["error"] = e.what();
    error_json["details"] = e.getDetails();

    crow::response res(e.getStatusCode(), error_json.dump());
    res.set_header("Content-Type", "application/json");
    return res;
}

crow::response handle_exception(const std::exception& e) {
    nlohmann::json error_json;
    error_json["error"] = "Internal Server Error";
    error_json["details"] = e.what(); // Include details for debugging, but be careful in production
    
    crow::response res(500, error_json.dump());
    res.set_header("Content-Type", "application/json");
    return res;
}

crow::response handle_unknown_exception() {
    nlohmann::json error_json;
    error_json["error"] = "An unknown error occurred.";
    error_json["details"] = "Please check server logs.";

    crow::response res(500, error_json.dump());
    res.set_header("Content-Type", "application/json");
    return res;
}
```