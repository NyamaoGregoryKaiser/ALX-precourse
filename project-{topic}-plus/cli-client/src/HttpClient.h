```cpp
#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <curl/curl.h>
#include <json/json.h>
#include <stdexcept>
#include <iostream>

/**
 * @brief Represents an HTTP response.
 */
struct HttpResponse {
    long statusCode;
    std::string body;
    std::map<std::string, std::string> headers; // Not fully parsed, but can be extended

    bool isSuccess() const {
        return statusCode >= 200 && statusCode < 300;
    }

    Json::Value toJson() const {
        Json::Value root;
        Json::CharReaderBuilder builder;
        std::string errs;
        std::istringstream s(body);
        if (body.empty() || !Json::parseFromStream(builder, s, &root, &errs)) {
            // If body is empty or not valid JSON, return a simple error structure
            root["error"] = "Failed to parse JSON response or response body is empty.";
            root["raw_response"] = body;
            return root;
        }
        return root;
    }
};

/**
 * @brief Generic HTTP client using libcurl.
 */
class HttpClient {
public:
    HttpClient() {
        curl_global_init(CURL_GLOBAL_DEFAULT);
    }

    ~HttpClient() {
        curl_global_cleanup();
    }

    /**
     * @brief Performs an HTTP GET request.
     * @param url The URL to request.
     * @param headers Optional map of request headers.
     * @return The HTTP response.
     */
    HttpResponse get(const std::string& url, const std::map<std::string, std::string>& headers = {}) {
        return request("GET", url, "", headers);
    }

    /**
     * @brief Performs an HTTP POST request.
     * @param url The URL to request.
     * @param body The request body (JSON string).
     * @param headers Optional map of request headers.
     * @return The HTTP response.
     */
    HttpResponse post(const std::string& url, const std::string& body, const std::map<std::string, std::string>& headers = {}) {
        return request("POST", url, body, headers);
    }

    /**
     * @brief Performs an HTTP PATCH request.
     * @param url The URL to request.
     * @param body The request body (JSON string).
     * @param headers Optional map of request headers.
     * @return The HTTP response.
     */
    HttpResponse patch(const std::string& url, const std::string& body, const std::map<std::string, std::string>& headers = {}) {
        return request("PATCH", url, body, headers);
    }

    /**
     * @brief Performs an HTTP DELETE request.
     * @param url The URL to request.
     * @param headers Optional map of request headers.
     * @return The HTTP response.
     */
    HttpResponse del(const std::string& url, const std::map<std::string, std::string>& headers = {}) {
        return request("DELETE", url, "", headers);
    }

private:
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
        ((std::string*)userp)->append((char*)contents, size * nmemb);
        return size * nmemb;
    }

    HttpResponse request(const std::string& method, const std::string& url,
                         const std::string& body, const std::map<std::string, std::string>& headers) {
        CURL* curl = curl_easy_init();
        if (!curl) {
            throw std::runtime_error("Failed to initialize cURL.");
        }

        HttpResponse response;
        std::string readBuffer;
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L); // Follow redirects
        curl_easy_setopt(curl, CURLOPT_TCP_KEEPALIVE, 1L); // Keep-alive

        struct curl_slist* curlHeaders = nullptr;
        curlHeaders = curl_slist_append(curlHeaders, "Content-Type: application/json"); // Default JSON

        for (const auto& header : headers) {
            curlHeaders = curl_slist_append(curlHeaders, (header.first + ": " + header.second).c_str());
        }
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, curlHeaders);

        if (method == "POST") {
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, body.length());
        } else if (method == "PATCH") {
            curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, body.length());
        } else if (method == "DELETE") {
            curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
        } else if (method == "GET") {
            // GET is default
        } else {
            throw std::runtime_error("Unsupported HTTP method: " + method);
        }

        CURLcode res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            std::string errMsg = "cURL request failed: ";
            errMsg += curl_easy_strerror(res);
            curl_easy_cleanup(curl);
            curl_slist_free_all(curlHeaders);
            throw std::runtime_error(errMsg);
        }

        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response.statusCode);
        response.body = readBuffer;

        curl_easy_cleanup(curl);
        curl_slist_free_all(curlHeaders);

        return response;
    }
};

#endif // HTTP_CLIENT_H
```