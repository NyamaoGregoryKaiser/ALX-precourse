#include <catch2/catch_test_macros.hpp>
#include <fstream>
#include <filesystem>
#include "utils/AppConfig.h"

namespace fs = std::filesystem;

// Helper to create a temporary config file
void createTempConfigFile(const std::string& filename, const std::string& content) {
    std::ofstream file(filename);
    REQUIRE(file.is_open());
    file << content;
    file.close();
}

TEST_CASE("AppConfig loads and retrieves values correctly", "[AppConfig][Unit]") {
    // Ensure the config is not already loaded by another test or previous run
    // For unit tests, it's often better to isolate or reset singletons.
    // As AppConfig::load has a guard, we'll test the first load.

    const std::string test_config_path = "test_app_config.json";
    const std::string config_content = R"({
        "server_host": "127.0.0.1",
        "server_port": 8080,
        "server_threads": 4,
        "debug_mode": true,
        "empty_string": ""
    })";

    createTempConfigFile(test_config_path, config_content);

    AppConfig& config = AppConfig::getInstance();
    REQUIRE(config.load(test_config_path));

    SECTION("Retrieves string values") {
        REQUIRE(config.getString("server_host") == "127.0.0.1");
        REQUIRE(config.getString("empty_string") == "");
        REQUIRE(config.getString("non_existent_key", "default") == "default");
    }

    SECTION("Retrieves int values") {
        REQUIRE(config.getInt("server_port") == 8080);
        REQUIRE(config.getInt("server_threads") == 4);
        REQUIRE(config.getInt("non_existent_int", 99) == 99);
    }

    SECTION("Retrieves bool values") {
        REQUIRE(config.getBool("debug_mode") == true);
        REQUIRE(config.getBool("non_existent_bool", false) == false);
    }

    SECTION("Handles missing keys with defaults") {
        REQUIRE(config.getString("non_existent_key") == "");
        REQUIRE(config.getInt("another_missing_key") == 0);
        REQUIRE(config.getBool("yet_another_missing_key") == false);
    }

    SECTION("Attempts to reload are ignored (first load is sticky)") {
        const std::string new_content = R"({"server_port": 9000})";
        createTempConfigFile(test_config_path, new_content);
        // Attempt to load again, it should return true but not change the config
        REQUIRE(config.load(test_config_path));
        REQUIRE(config.getInt("server_port") == 8080); // Still the original port
    }

    // Clean up
    fs::remove(test_config_path);
}

TEST_CASE("AppConfig handles invalid file paths and content", "[AppConfig][Unit]") {
    AppConfig& config = AppConfig::getInstance(); // Get a fresh instance if possible or reset state

    SECTION("Non-existent file") {
        REQUIRE_FALSE(config.load("non_existent_config.json"));
    }

    SECTION("Invalid JSON content") {
        const std::string invalid_config_path = "invalid_app_config.json";
        createTempConfigFile(invalid_config_path, "{ \"key\": \"value\", }"); // Trailing comma makes it invalid JSON
        REQUIRE_FALSE(config.load(invalid_config_path));
        fs::remove(invalid_config_path);
    }
}