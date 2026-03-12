```cpp
#ifndef PAYMENT_PROCESSOR_HTTP_SERVER_HPP
#define PAYMENT_PROCESSOR_HTTP_SERVER_HPP

#include <Pistache/Endpoint.h>
#include <Pistache/Http.h>
#include <Pistache/Router.h>
#include "services/AuthService.hpp"
#include "services/AccountService.hpp"
#include "services/TransactionService.hpp"
#include "server/controllers/AuthController.hpp"
#include "server/controllers/AccountController.hpp"
#include "server/controllers/TransactionController.hpp"
#include "server/middleware/AuthMiddleware.hpp"
#include "util/Logger.hpp"

class HttpServer {
public:
    explicit HttpServer(Pistache::Address addr);
    ~HttpServer();

    void init(size_t thr = 2);
    void start();
    void shutdown();

    void setupRoutes();

private:
    std::shared_ptr<Pistache::Http::Endpoint> httpEndpoint;
    Pistache::Rest::Router router;

    // Repositories
    UserRepository userRepository;
    AccountRepository accountRepository;
    TransactionRepository transactionRepository;

    // Services
    AuthService authService;
    AccountService accountService;
    GatewayService gatewayService; // Placeholder for external gateway
    TransactionService transactionService;

    // Controllers
    AuthController authController;
    AccountController accountController;
    TransactionController transactionController;

    void logRequest(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next);
};

#endif // PAYMENT_PROCESSOR_HTTP_SERVER_HPP
```