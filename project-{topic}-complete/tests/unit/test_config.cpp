```cpp
#include "gtest/gtest.h"
#include "config/Config.h"
#include "utils/Logger.h" // For logging in tests

// Define a test fixture to manage resources (e.g., .env file)
class ConfigTest : public ::testing::Test {
protected:
    void SetUp() override {
        Logger::init(); // Initialize logger for test outputs
        // Create a dummy .env file for testing
        std::ofstream outfile(".env");
        outfile << "TEST_KEY=test_value\n";
        outfile << "ANOTHER_KEY=12345\n";
        outfile << "EMPTY_KEY=\n";
        outfile.close();
        Config::load(".env"); // Load the dummy config
    }

    void TearDown() override {
        // Clean up the dummy .env file
        std::remove(".env");
        Config::clear(); // Clear loaded config to avoid interference
    }
};

TEST_F(ConfigTest, LoadsExistingKey) {
    ASSERT_EQ(Config::get<std::string>("TEST_KEY"), "test_value");
}

TEST_F(ConfigTest, LoadsNumericKey) {
    ASSERT_EQ(Config::get<int>("ANOTHER_KEY"), 12345);
}

TEST_F(ConfigTest, ReturnsEmptyStringForEmptyKey) {
    ASSERT_EQ(Config::get<std::string>("EMPTY_KEY"), "");
}

TEST_F(ConfigTest, ReturnsDefaultValueForMissingKey) {
    ASSERT_EQ(Config::get<std::string>("NON_EXISTENT_KEY", "default"), "default");
}

TEST_F(ConfigTest, ReturnsDefaultNumericValueForMissingKey) {
    ASSERT_EQ(Config::get<int>("NON_EXISTENT_NUMERIC", 999), 999);
}

TEST_F(ConfigTest, ThrowsForMissingKeyWithoutDefault) {
    ASSERT_THROW(Config::get<std::string>("ANOTHER_MISSING_KEY"), std::runtime_error);
}

TEST_F(ConfigTest, IsLoadedAfterLoading) {
    ASSERT_TRUE(Config::isLoaded());
}

TEST_F(ConfigTest, ReloadsConfig) {
    // Modify the .env file
    std::ofstream outfile(".env");
    outfile << "TEST_KEY=new_value\n";
    outfile.close();

    Config::load(".env"); // Reload
    ASSERT_EQ(Config::get<std::string>("TEST_KEY"), "new_value");
}
```