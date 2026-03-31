#pragma once

#include <string>
#include <memory>
#include <mutex>

struct redisContext; // Forward declaration for hiredis context

class RedisManager {
public:
    static RedisManager& getInstance();

    // Connects to the Redis server
    bool connect(const std::string& host, int port, const std::string& password = "");

    // Disconnects from the Redis server
    void disconnect();

    // Sets a key-value pair in Redis (string)
    bool set(const std::string& key, const std::string& value, int ttlSeconds = 0);

    // Gets a value from Redis by key
    std::optional<std::string> get(const std::string& key);

    // Deletes a key from Redis
    bool del(const std::string& key);

    // Delete copy constructor and assignment operator for singleton
    RedisManager(const RedisManager&) = delete;
    RedisManager& operator=(const RedisManager&) = delete;

private:
    RedisManager() = default;
    ~RedisManager(); // Destructor to ensure disconnection

    redisContext* context_ = nullptr;
    std::mutex mutex_;
    std::string host_;
    int port_;
    std::string password_;
};