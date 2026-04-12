#include "HttpUtils.h"
#include "utils/Logger.h"
#include <curlpp/cURLpp.hpp>
#include <curlpp/Easy.hpp>
#include <curlpp/Options.hpp>
#include <curlpp/Exception.hpp>
#include <sstream>

// Callback function for cURL to write response body
size_t write_callback(char* ptr, size_t size, size_t nmemb, void* userdata) {
    reinterpret_cast<std::string*>(userdata)->append(ptr, size * nmemb);
    return size * nmemb;
}

HttpUtils::HttpResponse HttpUtils::get(const std::string& url, const std::map<std::string, std::string>& headers) {
    HttpResponse response;
    std::stringstream response_body_stream;

    try {
        curlpp::Cleanup cleaner;
        curlpp::Easy request;

        request.setOpt(new curlpp::options::Url(url));
        request.setOpt(new curlpp::options::WriteStream(&response_body_stream));
        request.setOpt(new curlpp::options::FollowLocation(true)); // Follow redirects
        request.setOpt(new curlpp::options::Timeout(30));          // 30 second timeout

        std::list<std::string> header_list;
        for (const auto& header : headers) {
            header_list.push_back(header.first + ": " + header.second);
        }
        // Add a default User-Agent if not provided
        if (headers.find("User-Agent") == headers.end()) {
             header_list.push_back("User-Agent: WebScraperCPP/1.0 (Mozilla/5.0)");
        }
        request.setOpt(new curlpp::options::HttpHeader(header_list));

        request.perform();

        response.status_code = curlpp::infos::ResponseCode::get(request);
        response.body = response_body_stream.str();
        // Additional info like headers can be parsed from debug callback if needed

        LOG_DEBUG("HTTP GET {} - Status: {}", url, response.status_code);

    } catch (curlpp::LogicError &e) {
        response.error_message = std::string("cURLpp Logic Error: ") + e.what();
        LOG_ERROR("cURLpp Logic Error: {} for URL {}", e.what(), url);
    } catch (curlpp::RuntimeError &e) {
        response.error_message = std::string("cURLpp Runtime Error: ") + e.what();
        LOG_ERROR("cURLpp Runtime Error: {} for URL {}", e.what(), url);
    } catch (const std::exception& e) {
        response.error_message = std::string("HTTP GET general error: ") + e.what();
        LOG_ERROR("HTTP GET general error: {} for URL {}", e.what(), url);
    }
    return response;
}

HttpUtils::HttpResponse HttpUtils::post(const std::string& url, const std::string& body, const std::map<std::string, std::string>& headers) {
    HttpResponse response;
    std::stringstream response_body_stream;

    try {
        curlpp::Cleanup cleaner;
        curlpp::Easy request;

        request.setOpt(new curlpp::options::Url(url));
        request.setOpt(new curlpp::options::PostFields(body));
        request.setOpt(new curlpp::options::PostFieldSize(body.length()));
        request.setOpt(new curlpp::options::WriteStream(&response_body_stream));
        request.setOpt(new curlpp::options::FollowLocation(true));
        request.setOpt(new curlpp::options::Timeout(30));

        std::list<std::string> header_list;
        header_list.push_back("Content-Type: application/json"); // Default to JSON for POST body
        for (const auto& header : headers) {
            header_list.push_back(header.first + ": " + header.second);
        }
         if (headers.find("User-Agent") == headers.end()) {
             header_list.push_back("User-Agent: WebScraperCPP/1.0 (Mozilla/5.0)");
        }
        request.setOpt(new curlpp::options::HttpHeader(header_list));

        request.perform();

        response.status_code = curlpp::infos::ResponseCode::get(request);
        response.body = response_body_stream.str();

        LOG_DEBUG("HTTP POST {} - Status: {}", url, response.status_code);

    } catch (curlpp::LogicError &e) {
        response.error_message = std::string("cURLpp Logic Error: ") + e.what();
        LOG_ERROR("cURLpp Logic Error: {} for URL {}", e.what(), url);
    } catch (curlpp::RuntimeError &e) {
        response.error_message = std::string("cURLpp Runtime Error: ") + e.what();
        LOG_ERROR("cURLpp Runtime Error: {} for URL {}", e.what(), url);
    } catch (const std::exception& e) {
        response.error_message = std::string("HTTP POST general error: ") + e.what();
        LOG_ERROR("HTTP POST general error: {} for URL {}", e.what(), url);
    }
    return response;
}