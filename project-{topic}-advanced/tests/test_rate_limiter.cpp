```cpp
#include "gtest/gtest.h"
#include "../src/utils/rate_limiter.h"
#include <string>
#include <chrono>
#include <thread> // For std::this_thread::sleep_for

using namespace mobile_backend::utils;

TEST(RateLimiterTest, AllowRequestsWithinLimit) {
    RateLimiter limiter(3, std::chrono::seconds(5)); // 3 requests in 5 seconds
    std::string ip = "192.168.1.1";

    ASSERT_TRUE(limiter.allow_request(ip)); // 1st request
    ASSERT_TRUE(limiter.allow_request(ip)); // 2nd request
    ASSERT_TRUE(limiter.allow_request(ip)); // 3rd request

    ASSERT_EQ(limiter.get_request_count(ip), 3);
}

TEST(RateLimiterTest, DenyRequestsExceedingLimit) {
    RateLimiter limiter(3, std::chrono::seconds(5));
    std::string ip = "192.168.1.2";

    limiter.allow_request(ip);
    limiter.allow_request(ip);
    limiter.allow_request(ip);
    
    ASSERT_FALSE(limiter.allow_request(ip)); // 4th request, should be denied
    ASSERT_EQ(limiter.get_request_count(ip), 3); // Count should remain 3 as the 4th was denied and not added
}

TEST(RateLimiterTest, RequestsResetAfterWindow) {
    RateLimiter limiter(2, std::chrono::seconds(1)); // 2 requests in 1 second
    std::string ip = "192.168.1.3";

    ASSERT_TRUE(limiter.allow_request(ip));
    ASSERT_TRUE(limiter.allow_request(ip));
    ASSERT_FALSE(limiter.allow_request(ip)); // Denied

    std::this_thread::sleep_for(std::chrono::seconds(2)); // Wait for 2 seconds (past window)

    ASSERT_TRUE(limiter.allow_request(ip)); // Should be allowed again
    ASSERT_EQ(limiter.get_request_count(ip), 1); // Only 1 request in the new window
}

TEST(RateLimiterTest, MultipleIPsAreIndependent) {
    RateLimiter limiter(1, std::chrono::seconds(1)); // 1 request in 1 second
    std::string ip1 = "192.168.1.4";
    std::string ip2 = "192.168.1.5";

    ASSERT_TRUE(limiter.allow_request(ip1));
    ASSERT_FALSE(limiter.allow_request(ip1)); // ip1 is rate limited

    ASSERT_TRUE(limiter.allow_request(ip2)); // ip2 should not be affected
    ASSERT_FALSE(limiter.allow_request(ip2)); // ip2 is now rate limited
}

TEST(RateLimiterTest, ClearMethodWorks) {
    RateLimiter limiter(5, std::chrono::seconds(10));
    std::string ip = "192.168.1.6";

    limiter.allow_request(ip);
    limiter.allow_request(ip);
    ASSERT_EQ(limiter.get_request_count(ip), 2);

    limiter.clear();
    ASSERT_EQ(limiter.get_request_count(ip), 0); // After clear, count should be 0
    ASSERT_TRUE(limiter.allow_request(ip)); // Should be allowed again
}

TEST(RateLimiterTest, EdgeCaseZeroMaxRequests) {
    RateLimiter limiter(0, std::chrono::seconds(5)); // Zero requests allowed
    std::string ip = "192.168.1.7";

    ASSERT_FALSE(limiter.allow_request(ip));
    ASSERT_EQ(limiter.get_request_count(ip), 0);
}

TEST(RateLimiterTest, EdgeCaseZeroWindow) {
    RateLimiter limiter(1, std::chrono::seconds(0)); // Window of 0 seconds effectively means 1 request per instant.
                                                    // This is unusual but should function.
    std::string ip = "192.168.1.8";

    // In practice, this would behave like a very fast expiring cache.
    // If requests happen within the same clock tick, it might limit.
    // Given std::chrono::steady_clock's resolution, this might allow multiple
    // in quick succession before the time literally moves.
    // For this test, we expect the count to reset extremely quickly.
    ASSERT_TRUE(limiter.allow_request(ip));
    ASSERT_FALSE(limiter.allow_request(ip)); // Second request immediately after
    std::this_thread::sleep_for(std::chrono::milliseconds(1)); // Small delay
    ASSERT_TRUE(limiter.allow_request(ip)); // Should be allowed again, as window passed
}

TEST(RateLimiterTest, CleanupOldTimestamps) {
    RateLimiter limiter(5, std::chrono::seconds(2)); // 5 requests in 2 seconds
    std::string ip = "192.168.1.9";

    limiter.allow_request(ip); // t=0s
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    limiter.allow_request(ip); // t=0.5s
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    limiter.allow_request(ip); // t=1.0s

    ASSERT_EQ(limiter.get_request_count(ip), 3);

    std::this_thread::sleep_for(std::chrono::milliseconds(1500)); // t=2.5s (first request should be gone)

    ASSERT_EQ(limiter.get_request_count(ip), 2); // First request (at t=0s) should have expired
    
    ASSERT_TRUE(limiter.allow_request(ip)); // Should still be allowed, 3 requests left in current window
    ASSERT_EQ(limiter.get_request_count(ip), 3);
}
```