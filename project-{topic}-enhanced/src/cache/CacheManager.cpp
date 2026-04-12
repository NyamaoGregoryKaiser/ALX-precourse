#include "CacheManager.h"
#include "utils/Logger.h"
#include <cstdarg> // For va_list

CacheManager& CacheManager::get_instance() {
    static CacheManager instance;
    return instance;
}

void CacheManager::init(const std::string& host, int port) {
    CacheManager& instance = get_instance();
    if (instance.initialized_) {
        LOG_WARN("CacheManager already initialized.");
        return;
    }

    instance.host_ = host;
    instance.port_ = port;

    instance.redis_context_ = instance.connect_redis(host, port);
    if (instance.redis_context_) {
        instance.initialized_ = true;
        LOG_INFO("Redis CacheManager successfully connected to {}:{}.", host, port);
    } else {
        LOG_ERROR("Failed to connect to Redis at {}:{}.", host, port);
        // Do not throw, allow application to run without cache
    }
}

void CacheManager::shutdown() {
    CacheManager& instance = get_instance();
    std::lock_guard<std::mutex> lock(instance.redis_mutex_);
    if (instance.redis_context_) {
        redisFree(instance.redis_context_);
        instance.redis_context_ = nullptr;
        instance.initialized_ = false;
        LOG_INFO("Redis CacheManager shut down.");
    }
}

redisContext* CacheManager::connect_redis(const std::string& host, int port) {
    struct timeval timeout = { 1, 500000 }; // 1.5 seconds
    redisContext* c = redisConnectWithTimeout(host.c_str(), port, timeout);
    if (c == NULL || c->err) {
        if (c) {
            LOG_ERROR("Redis connection error: {}", c->errstr);
            redisFree(c);
        } else {
            LOG_ERROR("Could not allocate Redis context.");
        }
        return nullptr;
    }
    return c;
}

redisReply* CacheManager::execute_command(const char* format, ...) {
    if (!initialized_ || !redis_context_) {
        LOG_WARN("Attempted to execute Redis command but CacheManager is not initialized or connected.");
        return nullptr;
    }

    std::lock_guard<std::mutex> lock(redis_mutex_);
    redisReply* reply = nullptr;
    va_list args;
    va_start(args, format);
    reply = (redisReply*)redisvCommand(redis_context_, format, args);
    va_end(args);

    if (reply == nullptr) {
        LOG_ERROR("Redis command failed: {}", redis_context_->errstr);
        // Handle connection loss: attempt reconnect
        if (redis_context_->err == REDIS_ERR_IO || redis_context_->err == REDIS_ERR_EOF) {
            LOG_WARN("Redis connection lost. Attempting to reconnect...");
            redisFree(redis_context_);
            redis_context_ = connect_redis(host_, port_);
            if (redis_context_) {
                LOG_INFO("Redis reconnected.");
            } else {
                LOG_ERROR("Failed to reconnect to Redis.");
                initialized_ = false; // Mark as uninitialized if reconnect fails
            }
        }
    }
    return reply;
}

void CacheManager::set(const std::string& key, const std::string& value, int ttl_seconds) {
    redisReply* reply = nullptr;
    if (ttl_seconds > 0) {
        reply = execute_command("SETEX %s %d %s", key.c_str(), ttl_seconds, value.c_str());
    } else {
        reply = execute_command("SET %s %s", key.c_str(), value.c_str());
    }

    if (reply) {
        if (reply->type == REDIS_REPLY_STATUS && std::string(reply->str) == "OK") {
            LOG_DEBUG("Cached key '{}' successfully. TTL: {}", key, ttl_seconds);
        } else {
            LOG_ERROR("Failed to set key '{}' in cache. Reply type: {}, str: {}", key, reply->type, reply->str);
        }
        freeReplyObject(reply);
    }
}

std::optional<std::string> CacheManager::get(const std::string& key) {
    redisReply* reply = execute_command("GET %s", key.c_str());
    if (reply) {
        if (reply->type == REDIS_REPLY_STRING) {
            std::optional<std::string> value = reply->str;
            LOG_DEBUG("Cache hit for key '{}'.", key);
            freeReplyObject(reply);
            return value;
        } else if (reply->type == REDIS_REPLY_NIL) {
            LOG_DEBUG("Cache miss for key '{}'.", key);
        } else {
            LOG_WARN("Unexpected reply type for GET key '{}': {}", key, reply->type);
        }
        freeReplyObject(reply);
    }
    return std::nullopt;
}

bool CacheManager::del(const std::string& key) {
    redisReply* reply = execute_command("DEL %s", key.c_str());
    if (reply) {
        bool success = (reply->type == REDIS_REPLY_INTEGER && reply->integer > 0);
        if (success) {
            LOG_DEBUG("Deleted key '{}' from cache.", key);
        } else {
            LOG_WARN("Failed to delete key '{}' from cache or key did not exist.", key);
        }
        freeReplyObject(reply);
        return success;
    }
    return false;
}