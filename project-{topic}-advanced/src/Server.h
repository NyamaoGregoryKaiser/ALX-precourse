```cpp
#ifndef VISGENIUS_SERVER_H
#define VISGENIUS_SERVER_H

#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <iostream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <map>
#include <chrono>

#include "Router.h"
#include "HttpUtils.h"
#include "Logger.h"

// Forward declare RateLimiter (from Additional Features)
namespace VisGenius { class RateLimiter; }

namespace VisGenius {

class Server {
public:
    Server(int port, std::shared_ptr<Router> router, std::shared_ptr<RateLimiter> rate_limiter);
    ~Server();

    void start();
    void stop();

private:
    int m_port;
    int m_serverSocket;
    std::shared_ptr<Router> m_router;
    std::shared_ptr<RateLimiter> m_rateLimiter;
    std::atomic<bool> m_running;
    std::thread m_listenerThread;

    void listenerLoop();
    void handleClient(int client_socket);

    // Minimalist rate limiting, can be integrated with RateLimiter class
    std::map<std::string, std::chrono::steady_clock::time_point> m_lastRequestTime;
    std::map<std::string, int> m_requestCounts;
    std::mutex m_rateLimiterMutex;

    HttpResponse handleRateLimit(const HttpRequest& request);
};

} // namespace VisGenius

#endif // VISGENIUS_SERVER_H
```