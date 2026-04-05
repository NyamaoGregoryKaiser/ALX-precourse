```cpp
#ifndef TASK_CLI_CLIENT_H
#define TASK_CLI_CLIENT_H

#include "HttpClient.h"
#include <string>
#include <json/json.h>
#include <vector>
#include <iostream>
#include <iomanip> // For std::put_time
#include <ctime>   // For std::time_t, std::gmtime, std::mktime
#include <chrono>  // For date parsing
#include <map>     // For environment variables

// Simple ConfigLoader for CLI client
namespace CLIConfigLoader {
    inline std::string getEnv(const std::string& key, const std::string& defaultValue = "") {
        const char* value = std::getenv(key.c_str());
        if (value) {
            return std::string(value);
        }
        return defaultValue;
    }
}

/**
 * @brief CLI client for the Task Management System API.
 * Handles authentication and CRUD operations for users, projects, and tasks.
 */
class TaskClient {
public:
    TaskClient()
        : _baseUrl(CLIConfigLoader::getEnv("API_BASE_URL", "http://localhost:8080")),
          _apiPrefix("/api/v1"),
          _loggedIn(false)
    {
        // Load .env for local dev
        std::ifstream file("cli-client/.env"); // Adjust path if needed
        if (file.is_open()) {
            std::string line;
            while (std::getline(file, line)) {
                size_t equalsPos = line.find('=');
                if (equalsPos != std::string::npos && line[0] != '#') {
                    std::string key = line.substr(0, equalsPos);
                    std::string value = line.substr(equalsPos + 1);
                    // Trim whitespace
                    key.erase(0, key.find_first_not_of(" \t"));
                    key.erase(key.find_last_not_of(" \t") + 1);
                    value.erase(0, value.find_first_not_of(" \t"));
                    value.erase(value.find_last_not_of(" \t") + 1);
                    if (key == "API_BASE_URL") {
                        _baseUrl = value;
                    }
                }
            }
        } else {
            std::cerr << "Warning: cli-client/.env not found. Using default API_BASE_URL: " << _baseUrl << std::endl;
        }
    }

    void displayResponse(const HttpResponse& response) {
        std::cout << "HTTP Status: " << response.statusCode << std::endl;
        if (!response.body.empty()) {
            Json::Value parsedJson = response.toJson();
            std::cout << "Response Body:" << std::endl << parsedJson.toStyledString() << std::endl;
        } else {
            std::cout << "Response Body: (empty)" << std::endl;
        }
    }

    bool isLoggedIn() const {
        return _loggedIn;
    }

    // --- Authentication ---
    void registerUser(const std::string& username, const std::string& email, const std::string& password) {
        Json::Value body;
        body["username"] = username;
        body["email"] = email;
        body["password"] = password;
        HttpResponse response = _httpClient.post(_baseUrl + _apiPrefix + "/auth/register", body.toStyledString());
        displayResponse(response);
    }

    void login(const std::string& username, const std::string& password) {
        Json::Value body;
        body["username"] = username;
        body["password"] = password;
        HttpResponse response = _httpClient.post(_baseUrl + _apiPrefix + "/auth/login", body.toStyledString());
        displayResponse(response);

        if (response.isSuccess()) {
            Json::Value respJson = response.toJson();
            if (respJson.isMember("token") && respJson["token"].isString()) {
                _jwtToken = respJson["token"].asString();
                _loggedIn = true;
                if (respJson.isMember("user") && respJson["user"].isMember("id")) {
                    _currentUserId = respJson["user"]["id"].asInt();
                    _currentUserRole = respJson["user"]["role"].asString();
                }
                std::cout << "Login successful. Welcome, " << username << "!" << std::endl;
            } else {
                std::cerr << "Login successful, but no token received." << std::endl;
                _loggedIn = false;
            }
        } else {
            std::cerr << "Login failed." << std::endl;
            _loggedIn = false;