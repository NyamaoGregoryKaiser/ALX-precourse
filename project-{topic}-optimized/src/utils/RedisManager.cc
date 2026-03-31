#include "RedisManager.h"
#include <hiredis/hiredis.h>
#include <spdlog/spdlog.h>
#include <stdexcept>

RedisManager& RedisManager::getInstance() {
    static RedisManager instance;
    return instance;
}

RedisManager::~RedisManager() {
    disconnect();
}

bool RedisManager::connect(const std::string& host, int port, const std::string& password) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (context_) {
        spdlog::warn("RedisManager already connected. Disconnecting and reconnecting.");
        redisFree(context_);
        context_ = nullptr;
    }

    host_ = host;
    port_ = port;
    password_ = password;

    context_ = redisConnect(host_.c_str(), port_);
    if (context_ == nullptr || context_->err) {
        if (context_) {
            spdlog::error("Redis connection error: {}", context_->errstr);
            redisFree(context_);
            context_ = nullptr;
        } else {
            spdlog::error("Failed to allocate Redis context for {}:{}.", host_, port_);
        }
        return false;
    }

    if (!password_.empty()) {
        redisReply* reply = (redisReply*)redisCommand(context_, "AUTH %s", password_.c_str());
        if (reply == nullptr || reply->type == REDIS_REPLY_ERROR) {
            spdlog::error("Redis authentication failed: {}. Error: {}", reply ? reply->str : "Unknown", context_->errstr);
            if (reply) freeReplyObject(reply);
            redisFree(context_);
            context_ = nullptr;
            return false;
        }
        freeReplyObject(reply);
        spdlog::info("Redis authenticated successfully.");
    }

    spdlog::info("Successfully connected to Redis at {}:{}.", host_, port_);
    return true;
}

void RedisManager::disconnect() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (context_) {
        spdlog::info("Disconnecting from Redis at {}:{}.", host_, port_);
        redisFree(context_);
        context_ = nullptr;
    }
}

bool RedisManager::set(const std::string& key, const std::string& value, int ttlSeconds) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!context_) {
        spdlog::error("Redis not connected. Cannot set key '{}'.", key);
        return false;
    }

    redisReply* reply;
    if (ttlSeconds > 0) {
        reply = (redisReply*)redisCommand(context_, "SET %s %s EX %d", key.c_str(), value.c_str(), ttlSeconds);
    } else {
        reply = (redisReply*)redisCommand(context_, "SET %s %s", key.c_str(), value.c_str());
    }

    if (reply == nullptr) {
        spdlog::error("Redis SET command failed for key '{}': {}.", key, context_->errstr);
        return false;
    }
    bool success = (reply->type != REDIS_REPLY_ERROR);
    if (!success) {
        spdlog::error("Redis SET command returned error for key '{}': {}", key, reply->str);
    }
    freeReplyObject(reply);
    return success;
}

std::optional<std::string> RedisManager::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!context_) {
        spdlog::error("Redis not connected. Cannot get key '{}'.", key);
        return std::nullopt;
    }

    redisReply* reply = (redisReply*)redisCommand(context_, "GET %s", key.c_str());
    if (reply == nullptr) {
        spdlog::error("Redis GET command failed for key '{}': {}.", key, context_->errstr);
        return std::nullopt;
    }

    std::optional<std::string> result = std::nullopt;
    if (reply->type == REDIS_REPLY_STRING) {
        result = std::string(reply->str, reply->len);
    } else if (reply->type == REDIS_REPLY_NIL) {
        // Key not found, which is a valid case
    } else {
        spdlog::error("Redis GET command returned unexpected type for key '{}': Type={}. Error: {}", key, reply->type, reply->str);
    }

    freeReplyObject(reply);
    return result;
}

bool RedisManager::del(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!context_) {
        spdlog::error("Redis not connected. Cannot delete key '{}'.", key);
        return false;
    }

    redisReply* reply = (redisReply*)redisCommand(context_, "DEL %s", key.c_str());
    if (reply == nullptr) {
        spdlog::error("Redis DEL command failed for key '{}': {}.", key, context_->errstr);
        return false;
    }
    bool success = (reply->type != REDIS_REPLY_ERROR);
    if (!success) {
        spdlog::error("Redis DEL command returned error for key '{}': {}", key, reply->str);
    }
    freeReplyObject(reply);
    return success;
}