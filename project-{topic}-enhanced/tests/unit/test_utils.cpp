```cpp
#include <catch2/catch_all.hpp>
#include "../../src/utils/Crypto.h"
#include "../../src/utils/JsonUtils.h"
#include "../../src/utils/Logger.h"
#include "../../src/services/CacheService.h"
#include "../../src/services/RateLimiter.h"
#include <nlohmann/json.hpp>
#include <thread>
#include <chrono>

// Initialize logger for tests
struct GlobalTestSetup {
    GlobalTestSetup() {
        Logger::init();
        Crypto::set_jwt_secret("test_secret_key_for_jwt"); // Set a secret for testing
        CacheService::init(10, 1); // 10 capacity, 1 second TTL
        RateLimiter::init(5, 5); // 5 requests in 5 seconds
    }
};
static GlobalTestSetup setup;

TEST_CASE("Crypto utility functions", "[utils][crypto]") {
    SECTION("Password hashing and verification") {
        std::string password = "mySecurePassword123";
        std::string hashed_password = Crypto::hash_password(password);

        REQUIRE_FALSE(hashed_password.empty());
        REQUIRE(hashed_password.length() > 30); // bcrypt hashes are long

        REQUIRE(Crypto::verify_password(password, hashed_password) == true);
        REQUIRE(Crypto::verify_password("wrongPassword", hashed_password) == false);
    }

    SECTION("JWT creation and verification") {
        std::string user_id = "test-user-id";
        std::string username = "testuser";
        int expiry = 10; // 10 seconds for test token

        std::string token = Crypto::create_jwt(user_id, username, expiry);
        REQUIRE_FALSE(token.empty());

        SECTION("Valid token verification") {
            jwt::decoded_jwt decoded = Crypto::verify_jwt(token);
            REQUIRE(decoded.get_subject() == user_id);
            REQUIRE(decoded.get_payload_claim("username").as_string() == username);
        }

        SECTION("Expired token verification") {
            std::this_thread::sleep_for(std::chrono::seconds(expiry + 1)); // Wait for token to expire
            REQUIRE_THROWS_AS(Crypto::verify_jwt(token), std::runtime_error);
        }

        SECTION("Invalid token verification") {
            std::string invalid_token = "invalid.token.string";
            REQUIRE_THROWS_AS(Crypto::verify_jwt(invalid_token), std::runtime_error);
        }
    }

    SECTION("UUID generation") {
        std::string uuid1 = Crypto::generate_uuid();
        std::string uuid2 = Crypto::generate_uuid();

        REQUIRE_FALSE(uuid1.empty());
        REQUIRE(uuid1.length() == 36); // Standard UUID length
        REQUIRE(uuid1 != uuid2);
    }
}

TEST_CASE("JsonUtils helper functions", "[utils][jsonutils]") {
    nlohmann::json j = {
        {"str_field", "hello"},
        {"int_field", 123},
        {"double_field", 45.67},
        {"bool_field", true},
        {"null_field", nullptr},
        {"optional_str", "optional_value"}
    };

    SECTION("get_string_required") {
        REQUIRE(JsonUtils::get_required<std::string>(j, "str_field") == "hello");
        REQUIRE_THROWS_AS(JsonUtils::get_required<std::string>(j, "missing_field"), std::runtime_error);
        REQUIRE_THROWS_AS(JsonUtils::get_required<std::string>(j, "int_field"), std::runtime_error); // Wrong type
    }

    SECTION("get_optional_string") {
        REQUIRE(JsonUtils::get_optional<std::string>(j, "optional_str") == "optional_value");
        REQUIRE(JsonUtils::get_optional<std::string>(j, "missing_field") == std::nullopt);
        REQUIRE(JsonUtils::get_optional<std::string>(j, "null_field") == std::nullopt);
        REQUIRE_THROWS_AS(JsonUtils::get_optional<std::string>(j, "int_field"), std::runtime_error); // Wrong type
    }
    
    SECTION("get_int_required") {
        REQUIRE(JsonUtils::get_required<int>(j, "int_field") == 123);
        REQUIRE_THROWS_AS(JsonUtils::get_required<int>(j, "missing_field"), std::runtime_error);
        REQUIRE_THROWS_AS(JsonUtils::get_required<int>(j, "str_field"), std::runtime_error); // Wrong type
    }

    SECTION("get_double_required") {
        REQUIRE(JsonUtils::get_required<double>(j, "double_field") == 45.67);
        REQUIRE(JsonUtils::get_required<double>(j, "int_field") == 123.0); // int can be converted to double
        REQUIRE_THROWS_AS(JsonUtils::get_required<double>(j, "missing_field"), std::runtime_error);
    }

    SECTION("get_bool_required") {
        REQUIRE(JsonUtils::get_required<bool>(j, "bool_field") == true);
        REQUIRE_THROWS_AS(JsonUtils::get_required<bool>(j, "missing_field"), std::runtime_error);
        REQUIRE_THROWS_AS(JsonUtils::get_required<bool>(j, "str_field"), std::runtime_error); // Wrong type
    }
}


TEST_CASE("CacheService functionality", "[services][cache]") {
    CacheService::clear(); // Start fresh for each test case
    CacheService::init(3, 10); // Capacity 3, TTL 10 seconds

    SECTION("Set and Get") {
        CacheService::set("key1", "value1");
        REQUIRE(CacheService::get("key1") == "value1");
        REQUIRE(CacheService::size() == 1);
    }

    SECTION("LRU eviction") {
        CacheService::set("key1", "value1");
        CacheService::set("key2", "value2");
        CacheService::set("key3", "value3");
        REQUIRE(CacheService::size() == 3);

        // Access key1 to make it MRU
        CacheService::get("key1");

        // Add key4, key2 should be evicted (as it's LRU after key1 was accessed)
        CacheService::set("key4", "value4");
        REQUIRE(CacheService::size() == 3);
        REQUIRE(CacheService::get("key1") == "value1");
        REQUIRE(CacheService::get("key3") == "value3");
        REQUIRE(CacheService::get("key4") == "value4");
        REQUIRE(CacheService::get("key2") == std::nullopt); // key2 should be gone
    }

    SECTION("TTL expiration") {
        CacheService::init(3, 1); // 1 second TTL
        CacheService::set("expiring_key", "expiring_value");
        REQUIRE(CacheService::get("expiring_key") == "expiring_value");
        std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for expiration
        REQUIRE(CacheService::get("expiring_key") == std::nullopt);
        REQUIRE(CacheService::size() == 0); // After access, expired items are removed
    }

    SECTION("Remove item") {
        CacheService::set("to_be_removed", "value");
        REQUIRE(CacheService::get("to_be_removed") == "value");
        CacheService::remove("to_be_removed");
        REQUIRE(CacheService::get("to_be_removed") == std::nullopt);
        REQUIRE(CacheService::size() == 0);
    }

    SECTION("Clear cache") {
        CacheService::set("key1", "value1");
        CacheService::set("key2", "value2");
        REQUIRE(CacheService::size() == 2);
        CacheService::clear();
        REQUIRE(CacheService::size() == 0);
        REQUIRE(CacheService::get("key1") == std::nullopt);
    }
}

TEST_CASE("RateLimiter functionality", "[services][rate-limiter]") {
    RateLimiter::clear_all_history(); // Start fresh
    RateLimiter::init(3, 2); // Allow 3 requests in 2 seconds

    std::string client_ip = "192.168.1.100";

    SECTION("Within limit") {
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // 1st request
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // 2nd request
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // 3rd request
        REQUIRE(RateLimiter::is_rate_limited(client_ip) == true); // 4th request should be limited
    }

    SECTION("Sliding window resets") {
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // 1
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // 2
        std::this_thread::sleep_for(std::chrono::seconds(1)); // 1 second passes
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // 3
        REQUIRE(RateLimiter::is_rate_limited(client_ip) == true); // Limited

        std::this_thread::sleep_for(std::chrono::seconds(2)); // Window passes (2 seconds total)
        // First request should now be outside the 2-second window
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // Should be allowed again
    }

    SECTION("Multiple clients") {
        std::string client_ip_a = "192.168.1.10";
        std::string client_ip_b = "192.168.1.11";

        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip_a));
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip_b)); // Independent limit
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip_a));
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip_a));
        REQUIRE(RateLimiter::is_rate_limited(client_ip_a) == true); // A is limited

        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip_b)); // B still has one request left
        REQUIRE(RateLimiter::is_rate_limited(client_ip_b) == true); // B is now limited
    }

    SECTION("Clear history") {
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip));
        REQUIRE(RateLimiter::is_rate_limited(client_ip) == false);
        RateLimiter::clear_history(client_ip);
        REQUIRE_FALSE(RateLimiter::is_rate_limited(client_ip)); // Should be reset
    }
}
```