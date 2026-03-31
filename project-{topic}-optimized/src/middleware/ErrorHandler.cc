#include "ErrorHandler.h"
#include <drogon/drogon.h>
#include <spdlog/spdlog.h>

void ErrorHandler::doFilter(const drogon::HttpRequestPtr &req,
                              drogon::FilterCallback &&fcb,
                              drogon::FilterChainCallback &&fccb) {
    try {
        fccb(); // Continue to the next filter or controller
    } catch (const ApiError& e) {
        // Handle custom API errors
        spdlog::warn("API Error caught: {}: {} - {}", e.errorCode, e.what(), req->path());
        auto resp = drogon::HttpResponse::newHttpJsonResponse(e.toJson());
        resp->setStatusCode(static_cast<drogon::HttpStatusCode>(e.statusCode));
        fcb(resp);
    } catch (const std::exception& e) {
        // Handle generic C++ exceptions
        spdlog::error("Unhandled exception caught: {} - {}", e.what(), req->path());
        InternalServerError internalError(std::string("An unexpected error occurred: ") + e.what());
        auto resp = drogon::HttpResponse::newHttpJsonResponse(internalError.toJson());
        resp->setStatusCode(drogon::k500InternalServerError);
        fcb(resp);
    } catch (...) {
        // Handle unknown exceptions
        spdlog::critical("Unknown exception caught in ErrorHandler for path: {}", req->path());
        InternalServerError internalError("An unknown and unexpected error occurred.");
        auto resp = drogon::HttpResponse::newHttpJsonResponse(internalError.toJson());
        resp->setStatusCode(drogon::k500InternalServerError);
        fcb(resp);
    }
}