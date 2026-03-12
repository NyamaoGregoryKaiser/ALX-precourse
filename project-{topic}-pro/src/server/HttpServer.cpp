```cpp
#include "server/HttpServer.hpp"
#include "exceptions/ApiException.hpp" // Include custom exceptions for error handling
#include <string>
#include <iostream>

HttpServer::HttpServer(Pistache::Address addr)
    : httpEndpoint(std::make_shared<Pistache::Http::Endpoint>(addr)),
      // Initialize services and controllers with their dependencies
      authService(userRepository),
      accountService(accountRepository),
      gatewayService(), // Default constructor for placeholder
      transactionService(transactionRepository, accountRepository, gatewayService),
      authController(authService),
      accountController(accountService),
      transactionController(transactionService) {}

HttpServer::~HttpServer() {
    shutdown();
}

void HttpServer::init(size_t thr) {
    auto opts = Pistache::Http::Endpoint::options()
        .threads(static_cast<int>(thr))
        .flags(Pistache::Tcp::Options::ReuseAddr); // Added for rapid restart during dev/testing
    httpEndpoint->init(opts);
    setupRoutes();
}

void HttpServer::start() {
    Logger::get()->info("HTTP server starting on {}:{}", httpEndpoint->address().host(), httpEndpoint->address().port());
    httpEndpoint->set=[&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        logRequest(request, std::move(response), [&](const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter resp){
            // Pass the request to the router
            this->router.handleRequest(req, std::move(resp));
        });
    };
    httpEndpoint->serve();
    Logger::get()->info("HTTP server stopped.");
}

void HttpServer::shutdown() {
    if (httpEndpoint) {
        httpEndpoint->shutdown();
        Logger::get()->info("HTTP server shut down.");
    }
}

void HttpServer::logRequest(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
    Logger::get()->info("Request: {} {}", request.method(), request.resource());
    next(request, std::move(response));
}

void HttpServer::setupRoutes() {
    using namespace Pistache::Rest;
    using namespace Pistache::Http;

    // Generic error handling (catch-all for uncaught exceptions)
    router.addCustomErrorHandler([&](const Request&, ResponseWriter writer) {
        try {
            // This handler is called for unhandled routes or uncaught exceptions in handlers.
            // If an exception was thrown and not caught by a more specific handler, this is where it lands.
            // Pistache itself handles 404 for unroutable paths, this is more for generic 500.
            Logger::get()->error("Unhandled API error. Returning 500.");
            writer.send(Code::Internal_Server_Error, "Internal Server Error");
            return ExceptionPtr(nullptr); // No exception to re-throw
        } catch (const std::exception& e) {
            Logger::get()->critical("Error in custom error handler: {}", e.what());
            return ExceptionPtr(nullptr);
        }
    });

    // Root endpoint
    Routes::Get(router, "/", Routes::bind(&HttpServer::logRequest, this, Routes::bind([&](const Request&, ResponseWriter response){
        response.headers().add<Header::ContentType>(Mime::Application_Json);
        response.send(Code::Ok, R"({"status": "Payment Processor API is running"})");
    })));

    // Authentication Endpoints
    Routes::Post(router, "/auth/register", Routes::bind(&AuthController::registerUser, &authController));
    Routes::Post(router, "/auth/login", Routes::bind(&AuthController::loginUser, &authController));

    // Account Endpoints (Protected)
    // Wrap handlers with authentication middleware
    auto authWrapper = [&](auto handler) {
        return Middleware::AuthMiddleware::authenticate, Routes::bind(handler);
    };

    Routes::Post(router, "/accounts",
                 Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&AccountController::createAccount, &accountController)));
    Routes::Get(router, "/accounts/:id",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&AccountController::getAccountById, &accountController)));
    Routes::Put(router, "/accounts/:id",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&AccountController::updateAccount, &accountController)));
    Routes::Delete(router, "/accounts/:id",
                   Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&AccountController::deleteAccount, &accountController)));
    Routes::Get(router, "/users/:userId/accounts",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&AccountController::getAccountsForUser, &accountController)));
    Routes::Post(router, "/accounts/:id/deposit",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&AccountController::deposit, &accountController)));
    Routes::Post(router, "/accounts/:id/withdraw",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&AccountController::withdraw, &accountController)));


    // Transaction Endpoints (Protected)
    Routes::Post(router, "/transactions/process",
                 Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&TransactionController::processTransaction, &transactionController)));
    Routes::Get(router, "/transactions/:id",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&TransactionController::getTransactionById, &transactionController)));
    Routes::Get(router, "/accounts/:accountId/transactions",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&TransactionController::getTransactionsForAccount, &transactionController)));
    Routes::Post(router, "/transactions/:id/refund",
                Routes::bind(Middleware::AuthMiddleware::authenticate, Routes::bind(&TransactionController::refundTransaction, &transactionController)));

    Logger::get()->info("API routes configured.");
}
```