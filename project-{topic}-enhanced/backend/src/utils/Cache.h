#pragma once

#include <string>
#include <memory>
#include <chrono>

// For actual Redis integration, you would use a client library like hiredis or redis-plus-plus.
// This is a conceptual interface.
class ICache {
public:
    virtual ~ICache() = default;
    virtual bool set(const std::string& key, const std::string& value, std::chrono::seconds expiry = std::chrono::seconds(0)) = 0;
    virtual std::string get(const std::string& key) = 0;
    virtual bool del(const std::string& key) = 0;
    virtual bool isConnected() const = 0;
};

class RedisCache : public ICache {
public:
    RedisCache(const std::string& host, int port, const std::string& password = "");
    ~RedisCache();

    bool set(const std::string& key, const std::string& value, std::chrono::seconds expiry = std::chrono::seconds(0)) override;
    std::string get(const std::string& key) override;
    bool del(const std::string& key) override;
    bool isConnected() const override;

private:
    // Placeholder for Redis client connection
    // For actual implementation, this would be a client library object (e.g., redis::client*)
    std::unique_ptr<void, void(*)(void*)> redis_client_conn_ = {nullptr, [](void*){}}; 
    bool connected_ = false;
    std::string host_;
    int port_;
    std::string password_;
};