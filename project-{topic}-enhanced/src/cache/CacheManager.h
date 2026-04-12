#pragma once

#include <string>
#include <optional>
#include <hiredis/hiredis.h>
#include <mutex>
#include <stdexcept>

class CacheManager {
public:
    static CacheManager& get_instance();
    static void init(const std::string& host, int port);
    static void shutdown();

    bool is_initialized() const { return initialized_; }

    void set(const std::string& key, const std::string& value, int ttl_seconds = 0);
    std::optional<std::string> get(const std::string& key);
    bool del(const std::string& key);

private:
    CacheManager() = default;
    CacheManager(const CacheManager&) = delete;
    CacheManager& operator=(const CacheManager&) = delete;

    redisContext* connect_redis(const std::string& host, int port);
    redisReply* execute_command(const char* format, ...);

    redisContext* redis_context_ = nullptr;
    std::mutex redis_mutex_;
    bool initialized_ = false;
    std::string host_;
    int port_;
};