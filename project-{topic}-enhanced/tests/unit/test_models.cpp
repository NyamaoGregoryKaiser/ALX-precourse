#include "gtest/gtest.h"
#include "models/User.h"
#include "models/ScrapeJob.h"
#include "models/ScrapedItem.h"
#include "models/AuthToken.h"
#include <chrono>

// Test User model
TEST(UserModelTest, UserRoleConversion) {
    ASSERT_EQ(user_role_to_string(UserRole::USER), "USER");
    ASSERT_EQ(user_role_to_string(UserRole::ADMIN), "ADMIN");
    ASSERT_EQ(string_to_user_role("USER").value(), UserRole::USER);
    ASSERT_EQ(string_to_user_role("ADMIN").value(), UserRole::ADMIN);
    ASSERT_FALSE(string_to_user_role("INVALID_ROLE"));
}

TEST(UserModelTest, IsAdmin) {
    User user;
    user.role = UserRole::USER;
    ASSERT_FALSE(user.is_admin());
    user.role = UserRole::ADMIN;
    ASSERT_TRUE(user.is_admin());
}

// Test ScrapeJob model
TEST(ScrapeJobModelTest, ScrapeJobStatusConversion) {
    ASSERT_EQ(scrape_job_status_to_string(ScrapeJobStatus::PENDING), "PENDING");
    ASSERT_EQ(scrape_job_status_to_string(ScrapeJobStatus::RUNNING), "RUNNING");
    ASSERT_EQ(string_to_scrape_job_status("COMPLETED").value(), ScrapeJobStatus::COMPLETED);
    ASSERT_FALSE(string_to_scrape_job_status("INVALID_STATUS"));
}

TEST(ScrapeJobModelTest, DefaultValues) {
    ScrapeJob job;
    ASSERT_EQ(job.id, 0);
    ASSERT_EQ(job.user_id, 0);
    ASSERT_TRUE(job.name.empty());
    ASSERT_EQ(job.status, ScrapeJobStatus::PENDING);
    ASSERT_EQ(job.cron_schedule, ""); // Default empty string, will be 'manual' in production code if not set
}

// Test ScrapedItem model
TEST(ScrapedItemModelTest, ScrapedItemDataStorage) {
    ScrapedItem item;
    item.id = 1;
    item.job_id = 10;
    item.url = "http://example.com/product/1";
    item.data["title"] = "Example Product";
    item.data["price"] = "$19.99";
    item.scraped_at = std::chrono::system_clock::now();

    ASSERT_EQ(item.id, 1);
    ASSERT_EQ(item.job_id, 10);
    ASSERT_EQ(item.url, "http://example.com/product/1");
    ASSERT_EQ(item.data.at("title"), "Example Product");
    ASSERT_EQ(item.data.at("price"), "$19.99");
}

// Test AuthToken model
TEST(AuthTokenModelTest, IsValid) {
    AuthToken token;
    token.user_id = 1;
    token.username = "testuser";
    token.role = "USER";
    token.iat = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    token.exp = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now() + std::chrono::hours(1));

    ASSERT_TRUE(token.is_valid());

    // Test invalid user_id
    token.user_id = 0;
    ASSERT_FALSE(token.is_valid());
    token.user_id = 1; // Reset

    // Test empty username
    token.username = "";
    ASSERT_FALSE(token.is_valid());
    token.username = "testuser"; // Reset

    // Test expired token
    token.exp = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now() - std::chrono::hours(1));
    ASSERT_FALSE(token.is_valid());
}