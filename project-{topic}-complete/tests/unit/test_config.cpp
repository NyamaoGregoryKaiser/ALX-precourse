```cpp
#include "gtest/gtest.h"
#include "../../src/config/Config.hpp"
#include "../../src/common/Exceptions.hpp"
#include "../../src/common/Logger.hpp" // Required for logging in tests

// Initialize logger for tests
struct GlobalTestEnvironment : public ::testing::Environment {
    void SetUp() override {
        MLToolkit::Common::Logger::init("test_ml_toolkit.log", spdlog::level::debug);
        LOG_INFO("Global test environment setup.");
    }
    void TearDown() override {
        LOG_INFO("Global test environment teardown.");
        // Clean up logger if necessary
    }
};

// Register the environment
[[maybe_unused]] static auto const env = ::testing::AddGlobalTestEnvironment(new GlobalTestEnvironment);

namespace MLToolkit {
namespace Config {

class ConfigTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Clear existing config before each test
        Config::get_instance().set("DB_HOST", "");
        Config::get_instance().set("API_PORT", "");
        Config::get_instance().set("LOG_LEVEL", "");
        // Create a dummy config file for testing
        std::ofstream file("test_config.conf");
        file << "DB_HOST=test_db_host\n";
        file << "API_PORT=9000\n";
        file << "# This is a comment\n";
        file << "LOG_LEVEL=debug\n";
        file << "BOOLEAN_TRUE=true\n";
        file << "BOOLEAN_FALSE=0\n";
        file << "INVALID_INT=abc\n";
        file.close();
    }

    void TearDown() override {
        std::remove("test_config.conf");
    }
};

TEST_F(ConfigTest, LoadsFromFile) {
    Config::get_instance().load("test_config.conf");
    ASSERT_EQ(Config::get_instance().get_string("DB_HOST"), "test_db_host");
    ASSERT_EQ(Config::get_instance().get_int("API_PORT"), 9000);
    ASSERT_EQ(Config::get_instance().get_string("LOG_LEVEL"), "debug");
}

TEST_F(ConfigTest, EnvironmentVariablesOverride) {
    // Set environment variables
    setenv("ML_DB_HOST", "env_db_host", 1);
    setenv("ML_API_PORT", "9001", 1);
    setenv("ML_LOG_LEVEL", "trace", 1);

    Config::get_instance().load("test_config.conf");

    ASSERT_EQ(Config::get_instance().get_string("DB_HOST"), "env_db_host");
    ASSERT_EQ(Config::get_instance().get_int("API_PORT"), 9001);
    ASSERT_EQ(Config::get_instance().get_string("LOG_LEVEL"), "trace");

    // Clean up environment variables
    unsetenv("ML_DB_HOST");
    unsetenv("ML_API_PORT");
    unsetenv("ML_LOG_LEVEL");
}

TEST_F(ConfigTest, GetStringWithDefault) {
    Config::get_instance().load("test_config.conf");
    ASSERT_EQ(Config::get_instance().get_string("NON_EXISTENT_KEY", "default_val"), "default_val");
}

TEST_F(ConfigTest, GetIntWithDefault) {
    Config::get_instance().load("test_config.conf");
    ASSERT_EQ(Config::get_instance().get_int("NON_EXISTENT_INT", 123), 123);
    ASSERT_EQ(Config::get_instance().get_int("INVALID_INT", 456), 456); // Fallback for invalid int
}

TEST_F(ConfigTest, GetBool) {
    Config::get_instance().load("test_config.conf");
    ASSERT_TRUE(Config::get_instance().get_bool("BOOLEAN_TRUE"));
    ASSERT_FALSE(Config::get_instance().get_bool("BOOLEAN_FALSE"));
    ASSERT_TRUE(Config::get_instance().get_bool("NON_EXISTENT_BOOL", true));
}

TEST_F(ConfigTest, FileMissing) {
    // Should not throw, but log a warning
    Config::get_instance().load("non_existent_config.conf");
    ASSERT_EQ(Config::get_instance().get_string("DB_HOST", "default"), "default");
}

TEST_F(ConfigTest, SetValue) {
    Config::get_instance().set("TEST_KEY", "test_value");
    ASSERT_EQ(Config::get_instance().get_string("TEST_KEY"), "test_value");
}

} // namespace Config
} // namespace MLToolkit
```