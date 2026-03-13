#include <pistache/endpoint.h>
#include <pistache/http.h>
#include <pistache/router.h>
#include <iostream>
#include <memory>
#include <stdexcept>

// Common utilities
#include "common/config.hpp"
#include "common/logger.hpp"

// Database
#include "database/db_connection.hpp"
#include "database/user_repository.hpp"
#include "database/content_repository.hpp"
#include "database/media_repository.hpp"

// Auth
#include "auth/jwt_manager.hpp"
#include "auth/auth_service.hpp"

// Services
#include "services/user_service.hpp"
#include "services/content_service.hpp"
#include "services/media_service.hpp"

// API Routes & Middleware
#include "api/router.hpp"
#include "api/middleware.hpp"
#include "api/auth_middleware.hpp"

// Cache
#include "cache/lru_cache.hpp"

void setup_application(Pistache::Http::Endpoint& server) {
    const auto& config = cms::common::AppConfig::get_instance();

    // 1. Initialize Logger
    cms::common::Logger::set_level(config.log_level);
    LOG_INFO("CMS System starting...");
    LOG_INFO("Application Port: {}", config.app_port);

    // 2. Initialize Database Connection (singleton, but ensure it's accessible)
    // The connection will be created on first use via DBConnection::get_instance().get_connection()

    // 3. Initialize Repositories
    auto user_repo = std::make_shared<cms::database::UserRepository>();
    auto content_repo = std::make_shared<cms::database::ContentRepository>();
    auto media_repo = std::make_shared<cms::database::MediaRepository>();

    // 4. Initialize Caches
    auto user_cache = std::make_shared<cms::cache::LRUCache<std::string, cms::models::User>>(config.cache_max_size);
    auto content_cache = std::make_shared<cms::cache::LRUCache<std::string, cms::models::Content>>(config.cache_max_size);
    // Media files are typically not cached in LRU by content, but by file server caches.

    // 5. Initialize Auth and Services
    auto jwt_manager = std::make_shared<cms::auth::JwtManager>(config.jwt_secret);
    auto auth_service = std::make_shared<cms::auth::AuthService>(user_repo, jwt_manager);
    auto user_service = std::make_shared<cms::services::UserService>(user_repo, user_cache);
    auto content_service = std::make_shared<cms::services::ContentService>(content_repo, content_cache);
    auto media_service = std::make_shared<cms::services::MediaService>(media_repo, "uploads"); // "uploads" is the directory name

    // 6. Setup API Router
    auto api_router = std::make_shared<cms::api::ApiRouter>(
        auth_service, user_service, content_service, media_service, jwt_manager
    );

    // 7. Configure Pistache Endpoint
    auto opts = Pistache::Http::Endpoint::options()
        .threads(std::max(1, static_cast<int>(std::thread::hardware_concurrency())))
        .flags(Pistache::Http::Endpoint::options::ReuseAddr);
    server.init(opts);
    server.set  handler(api_router->get_router().handler());

    LOG_INFO("CMS System initialized successfully.");
}

int main() {
    try {
        const auto& config = cms::common::AppConfig::get_instance(); // Load config early

        Pistache::Address addr(Pistache::Ipv4::any(), Pistache::Port(config.app_port));
        Pistache::Http::Endpoint server(addr);

        setup_application(server);

        server.serve(); // This blocks indefinitely
    } catch (const std::exception& e) {
        LOG_CRITICAL("Application startup failed: {}", e.what());
        return 1;
    } catch (...) {
        LOG_CRITICAL("Unknown error during application startup.");
        return 1;
    }

    return 0;
}
```