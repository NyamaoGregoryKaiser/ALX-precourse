#include "error_handler.h"

ErrorHandler::ErrorHandler() {
    LOG_INFO("ErrorHandler middleware initialized.");
}

void ErrorHandler::handle(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
    try {
        next(request, std::move(response)); // Pass response writer by value
    } catch (const ApiException& e) {
        LOG_WARN("API Exception caught: " + std::string(e.what()) + " (Status: " + std::to_string(e.getStatusCode()) + ")");
        send_error_response(response, e.getStatusCode(), e.what());
    } catch (const Pistache::Http::HttpError& e) {
        // Pistache internal HTTP errors (e.g., malformed request, not found by router)
        LOG_ERROR("Pistache HTTP Error: " + std::string(e.what()) + " (Status: " + std::to_string(e.code()) + ")");
        send_error_response(response, e.code(), "HTTP Error: " + std::string(e.what()));
    } catch (const std::exception& e) {
        LOG_ERROR("Unhandled exception caught: " + std::string(e.what()));
        send_error_response(response, Pistache::Http::Code::Internal_Server_Error, "An unexpected error occurred.");
    } catch (...) {
        LOG_ERROR("Unknown exception caught.");
        send_error_response(response, Pistache::Http::Code::Internal_Server_Error, "An unknown and unexpected error occurred.");
    }
}

void ErrorHandler::send_error_response(Pistache::Http::ResponseWriter& response, int status_code, const std::string& message) {
    Json::Value error_json;
    error_json["status"] = "error";
    error_json["message"] = message;

    response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
    response.send(Pistache::Http::Code(status_code), JsonUtil::to_string(error_json)).get(); // .get() for synchronous send
}
```