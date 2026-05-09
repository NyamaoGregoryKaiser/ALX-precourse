```cpp
#include "gtest/gtest.h"
#include "api/ApiServer.h"
#include "data/db/Database.h"
#include "data/db/repositories/UserRepository.h"
#include "core/config/ConfigManager.h"
#include "core/common/Utils.h" // For SHA256 mock
#include "util/Logger.h"
#include "util/ErrorHandler.h" // For APIException

#include <thread>
#include <chrono>
#include <future>
#include <nlohmann/json.hpp>

// Mock HTTP Client for API tests (similar to what DashboardController uses)
namespace Http {
    class MockClient {
    public:
        MockClient(const std::string& baseUrl) : m_baseUrl(baseUrl) {}

        struct Response {
            int status_code;
            std::string body;
            std::map<std::string, std::string> headers;
        };

        // Simplified mock for GET, POST with ability to simulate calls to the local ApiServer
        Response get(const std::string& path, const std::map<std::string, std::string>& headers = {}) {
            return simulateCall("GET", path, "", headers);
        }

        Response post(const std::string& path, const std::string& body, const std::map<std::string, std::string>& headers = {}) {
            return simulateCall("POST", path, body, headers);
        }

    private:
        std::string m_baseUrl;
        // This 'api_server_instance' is a mock representing direct access to the server's handlers,
        // bypassing actual network calls for internal integration tests.
        // In a real scenario, this would be a network call to localhost.