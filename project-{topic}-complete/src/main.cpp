```cpp
#include <iostream>
#include <string>
#include <memory>
#include <crow.h>
#include <cstdlib> // For getenv
#include "config/AppConfig.h"
#include "database/DatabaseManager.h"
#include "services/AuthService.h"
#include "services/AccountService.h"
#include "services/TransactionService.h"
#include "controllers/AuthController.h"
#include "controllers/AccountController.h"
#include "controllers/TransactionController.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorHandlerMiddleware.h"
#include "utils/JwtManager.h"
#include "utils/Logger.h"

int main(int argc, char* argv[]) {
    using namespace PaymentProcessor::Config;
    using namespace PaymentProcessor::Database;
    using namespace PaymentProcessor::Services;
    using namespace PaymentProcessor::Controllers;
    using namespace PaymentProcessor::Middleware;
    using namespace PaymentProcessor::Utils;

    // Initialize Logger early
    Logger::getLogger()->info("Payment Processor Application Starting...");

    // 1. Load configuration
    try {
        std::string configPath = "config/app.config.json";
        // Allow overriding config path with an environment variable or command line arg
        if (const char* env_config = std::getenv("PAYMENT_CONFIG_PATH")) {
            configPath = env_config;
        } else if (argc > 1) {
            configPath = argv[1];
        }
        AppConfig::getInstance().load(configPath);
        LOG_INFO("Configuration loaded from: {}", configPath);

        // Set JWT secret globally from config
        JwtManager::SECRET_KEY = AppConfig::getInstance().getJwtSecret();

    } catch (const std::runtime_error& e) {
        LOG_CRITICAL("Configuration error: {}", e.what());
        return 1;
    }

    // 2. Initialize Database Manager
    try {
        DatabaseManager::getInstance().init(AppConfig::getInstance().getDbPath());
        LOG_INFO("Database Initialized.");
    } catch (const Exceptions::DatabaseException& e) {
        LOG_CRITICAL("Database initialization failed: {}", e.what());
        return 1;
    }

    // 3. Initialize Services
    AuthService authService(DatabaseManager::getInstance());
    AccountService accountService(DatabaseManager::getInstance());
    TransactionService transactionService(DatabaseManager::getInstance());
    LOG_INFO("Services Initialized.");

    // 4. Initialize Controllers
    AuthController authController(authService);
    AccountController accountController(accountService);
    TransactionController transactionController(transactionService, accountService);
    LOG_INFO("Controllers Initialized.");

    // 5. Setup Crow application with middleware
    crow::App<AuthMiddleware, ErrorHandlerMiddleware> app;

    // Middleware setup (Crow automatically wires it based on template args)
    // AuthMiddleware checks JWT, ErrorHandlerMiddleware catches exceptions

    // --- API Routes ---

    // Auth Routes
    CROW_ROUTE(app, "/api/v1/auth/register")
        .methods(crow::HTTPMethod::POST)
        ([&](const crow::request& req) {
            return authController.registerUser(req);
        });

    CROW_ROUTE(app, "/api/v1/auth/login")
        .methods(crow::HTTPMethod::POST)
        ([&](const crow::request& req) {
            return authController.loginUser(req);
        });

    // Account Routes (Require Authentication)
    CROW_ROUTE(app, "/api/v1/accounts")
        .methods(crow::HTTPMethod::POST)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx) {
            return accountController.createAccount(req, ctx.authContext);
        });

    CROW_ROUTE(app, "/api/v1/accounts/<long>") // Get account by ID
        .methods(crow::HTTPMethod::GET)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx, long long accountId) {
            return accountController.getAccount(req, ctx.authContext, accountId);
        });

    CROW_ROUTE(app, "/api/v1/accounts/my") // Get all accounts for the authenticated user
        .methods(crow::HTTPMethod::GET)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx) {
            return accountController.getMyAccounts(req, ctx.authContext);
        });

    CROW_ROUTE(app, "/api/v1/accounts/<long>") // Update account
        .methods(crow::HTTPMethod::PUT, crow::HTTPMethod::PATCH)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx, long long accountId) {
            return accountController.updateAccount(req, ctx.authContext, accountId);
        });

    CROW_ROUTE(app, "/api/v1/accounts/<long>") // Delete account
        .methods(crow::HTTPMethod::DELETE)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx, long long accountId) {
            return accountController.deleteAccount(req, ctx.authContext, accountId);
        });

    // Transaction Routes (Require Authentication)
    CROW_ROUTE(app, "/api/v1/transactions")
        .methods(crow::HTTPMethod::POST)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx) {
            return transactionController.processTransaction(req, ctx.authContext);
        });

    CROW_ROUTE(app, "/api/v1/transactions/<long>") // Get transaction by ID
        .methods(crow::HTTPMethod::GET)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx, long long transactionId) {
            return transactionController.getTransaction(req, ctx.authContext, transactionId);
        });

    CROW_ROUTE(app, "/api/v1/accounts/<long>/transactions") // Get transactions for an account
        .methods(crow::HTTPMethod::GET)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx, long long accountId) {
            return transactionController.getTransactionsByAccount(req, ctx.authContext, accountId);
        });

    CROW_ROUTE(app, "/api/v1/transactions/<long>/status") // Update transaction status
        .methods(crow::HTTPMethod::PUT, crow::HTTPMethod::PATCH)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx, long long transactionId) {
            return transactionController.updateTransactionStatus(req, ctx.authContext, transactionId);
        });

    CROW_ROUTE(app, "/api/v1/transactions/<long>/refund") // Initiate a refund for an existing transaction
        .methods(crow::HTTPMethod::POST)
        ([&](const crow::request& req, AuthMiddleware::Context& ctx, long long originalTransactionId) {
            return transactionController.initiateRefund(req, ctx.authContext, originalTransactionId);
        });

    // Start server
    int port = AppConfig::getInstance().getServerPort();
    std::string host = AppConfig::getInstance().getServerHost();
    LOG_INFO("Starting server on {}:{}", host, port);
    app.port(port).bindaddr(host).multithreaded().run();

    LOG_INFO("Payment Processor Application Shutting Down.");
    return 0;
}
```