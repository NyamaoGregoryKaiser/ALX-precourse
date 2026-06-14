```cpp
#ifndef AURORA_METRICS_APPCONFIG_H
#define AURORA_METRICS_APPCONFIG_H

#include <string>

class AppConfig {
public:
    static void loadConfig();

    static int getServerPort();
    static const std::string& getDbConnectionString();
    static const std::string& getJwtSecret();
    static int getJwtExpirySeconds();
    static int getCacheTtlSeconds();
    static int getRateLimitMaxRequests();
    static int getRateLimitWindowSeconds();
    static int getAgentIntervalSeconds();

private:
    static int server_port;
    static std::string db_connection_string;
    static std::string jwt_secret;
    static int jwt_expiry_seconds;
    static int cache_ttl_seconds;
    static int rate_limit_max_requests;
    static int rate_limit_window_seconds;
    static int agent_interval_seconds;

    static std::string getEnv(const std::string& name, const std::string& default_value = "");
    static int getEnvAsInt(const std::string& name, int default_value);
};

#endif // AURORA_METRICS_APPCONFIG_H
```