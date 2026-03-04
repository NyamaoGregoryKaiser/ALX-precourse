```cpp
#include "gtest/gtest.h"
#include "Logger.h"
#include <fstream>
#include <string>
#include <filesystem>

// This test suite will test the Logger class.
// It will temporarily redirect log output to a file and check its content.

namespace fs = std::filesystem;

class LoggerTest : public ::testing::Test {
protected:
    VisGenius::Logger& logger = VisGenius::Logger::getInstance();
    std::string test_log_file = "test_log.log";
    std::streambuf* old_cerr_buf;
    std::streambuf* old_cout_buf;
    std::ofstream null_stream;

    void SetUp() override {
        // Ensure log file is clean before each test
        if (fs::exists(test_log_file)) {
            fs::remove(test_log_file);
        }
        logger.setLogFile(test_log_file);
        logger.setLogLevel(VisGenius::DEBUG); // Set to lowest level to capture all logs

        // Temporarily redirect cout and cerr to /dev/null to prevent test output pollution
        null_stream.open("/dev/null");
        old_cout_buf = std::cout.rdbuf();
        old_cerr_buf = std::cerr.rdbuf();
        std::cout.rdbuf(null_stream.rdbuf());
        std::cerr.rdbuf(null_stream.rdbuf());
    }

    void TearDown() override {
        logger.setLogFile(""); // Close the log file
        if (fs::exists(test_log_file)) {
            fs::remove(test_log_file);
        }
        // Restore cout and cerr
        std::cout.rdbuf(old_cout_buf);
        std::cerr.rdbuf(old_cerr_buf);
        null_stream.close();
    }

    std::string readLogFile() {
        std::ifstream file(test_log_file);
        std::stringstream buffer;
        buffer << file.rdbuf();
        return buffer.str();
    }
};

TEST_F(LoggerTest, DebugLevelLogsAll) {
    LOG_DEBUG("This is a debug message: {}", 123);
    LOG_INFO("This is an info message.");
    LOG_WARN("This is a warning message.");
    LOG_ERROR("This is an error message.");
    LOG_FATAL("This is a fatal message.");

    std::string log_content = readLogFile();
    ASSERT_NE(log_content.find("DEBUG"), std::string::npos);
    ASSERT_NE(log_content.find("INFO"), std::string::npos);
    ASSERT_NE(log_content.find("WARN"), std::string::npos);
    ASSERT_NE(log_content.find("ERROR"), std::string::npos);
    ASSERT_NE(log_content.find("FATAL"), std::string::npos);
    ASSERT_NE(log_content.find("This is a debug message: 123"), std::string::npos);
}

TEST_F(LoggerTest, InfoLevelFiltersDebug) {
    logger.setLogLevel(VisGenius::INFO);
    LOG_DEBUG("This is a debug message that should be filtered.");
    LOG_INFO("This is an info message that should pass.");

    std::string log_content = readLogFile();
    ASSERT_EQ(log_content.find("DEBUG"), std::string::npos); // Should not find DEBUG
    ASSERT_NE(log_content.find("INFO"), std::string::npos);
    ASSERT_NE(log_content.find("This is an info message that should pass."), std::string::npos);
}

TEST_F(LoggerTest, ErrorLevelFiltersLower) {
    logger.setLogLevel(VisGenius::ERROR);
    LOG_DEBUG("This debug should be filtered.");
    LOG_INFO("This info should be filtered.");
    LOG_WARN("This warn should be filtered.");
    LOG_ERROR("This error should pass.");

    std::string log_content = readLogFile();
    ASSERT_EQ(log_content.find("DEBUG"), std::string::npos);
    ASSERT_EQ(log_content.find("INFO"), std::string::npos);
    ASSERT_EQ(log_content.find("WARN"), std::string::npos);
    ASSERT_NE(log_content.find("ERROR"), std::string::npos);
    ASSERT_NE(log_content.find("This error should pass."), std::string::npos);
}

TEST_F(LoggerTest, LogFileCreation) {
    // Already set in SetUp, just verify it exists and has content
    LOG_INFO("Testing log file creation.");
    ASSERT_TRUE(fs::exists(test_log_file));
    std::string log_content = readLogFile();
    ASSERT_FALSE(log_content.empty());
    ASSERT_NE(log_content.find("Testing log file creation."), std::string::npos);
}

TEST_F(LoggerTest, MultipleLogsFormattedCorrectly) {
    LOG_INFO("User {} logged in from IP {}", "john_doe", "192.168.1.1");
    std::string log_content = readLogFile();
    ASSERT_NE(log_content.find("User john_doe logged in from IP 192.168.1.1"), std::string::npos);
}

TEST_F(LoggerTest, TimestampFormat) {
    LOG_INFO("Checking timestamp.");
    std::string log_content = readLogFile();
    // Regex for YYYY-MM-DD HH:MM:SS.ms format
    std::regex timestamp_regex("^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3}");
    std::smatch match;
    std::string first_line = log_content.substr(0, log_content.find('\n'));
    ASSERT_TRUE(std::regex_search(first_line, match, timestamp_regex));
}

```