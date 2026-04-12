#include "gtest/gtest.h"
#include "config/AppConfig.h"
#include "utils/Logger.h"
#include "database/DatabaseManager.h"
#include "cache/CacheManager.h"

// Initialize global resources for all tests
void setup_global_test_environment() {
    // Set minimal environment variables for tests
    setenv("APP_PORT", "8081", 1);
    setenv("DATABASE_URL", "postgresql://user:password@localhost:5432/webscraper_test_db", 1);
    setenv("JWT_SECRET", "test_secret_for_jwt_that_is_long_enough_for_hs256", 1);
    setenv("REDIS_HOST", "localhost", 1);
    setenv("REDIS_PORT", "6379", 1);
    setenv("RATE_LIMIT_REQUESTS", "5", 1);
    setenv("RATE_LIMIT_WINDOW_SECONDS", "10", 1);
    setenv("SCHEDULER_INTERVAL_SECONDS", "60", 1);

    AppConfig::load();
    Logger::init("test_app.log", spdlog::level::debug);
    DatabaseManager::init(AppConfig::get_instance().get_db_connection_string(), 1); // Small pool for tests
    CacheManager::init(AppConfig::get_instance().get_redis_host(), AppConfig::get_instance().get_redis_port());
}

// Clean up global resources after all tests
void teardown_global_test_environment() {
    DatabaseManager::shutdown();
    CacheManager::shutdown();
    Logger::get_logger()->flush();
    spdlog::drop_all();
}

int main(int argc, char **argv) {
    setup_global_test_environment();

    ::testing::InitGoogleTest(&argc, argv);
    int result = RUN_ALL_TESTS();

    teardown_global_test_environment();

    return result;
}