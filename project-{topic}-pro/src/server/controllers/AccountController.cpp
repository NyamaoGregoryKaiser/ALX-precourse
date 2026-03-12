```cpp
#include "server/controllers/AccountController.hpp"
#include "server/controllers/AuthController.hpp" // For getAuthenticatedUserDetails
#include "exceptions/ApiException.hpp"
#include "util/Logger.hpp"
#include <string>
#include <stdexcept>

AccountController::AccountController(AccountService& accountService)
    : accountService(accountService) {}

void AccountController::createAccount(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        auto userDetails = AuthController::getAuthenticatedUserDetails(request);
        if (!userDetails || userDetails->role != nlohmann::json(UserRole::Customer).dump()) {
            throw ForbiddenException("Only customers can create accounts for themselves.");
        }

        nlohmann::json body = nlohmann::json::parse(request.body());
        std::string accountName = body.at("accountName").get<std::string>();
        std::string currency = body.value("currency", "USD"); // Default currency

        // Only allow user to create account for themselves
        long ownerUserId = userDetails->userId;

        Account newAccount = accountService.createAccount(ownerUserId, accountName, currency);
        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Pistache::Http::Code::Created, newAccount.toJson().dump());
        Logger::get()->info("Account created for user {}: {}", ownerUserId, newAccount.accountNumber);

    } catch (const nlohmann::json::exception& e) {
        Logger::get()->warn("JSON parsing error in createAccount: {}", e.what());
        response.send(Pistache::Http::Code::Bad_Request, "Invalid JSON body: " + std::string(e.what()));
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error creating account: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

void AccountController::getAccountById(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        auto userDetails = AuthController::getAuthenticatedUserDetails(request);
        if (!userDetails) { // Should be caught by middleware, but good for defense-in-depth
            throw UnauthorizedException();
        }

        long accountId = request.param(":id").as<long>();
        std::optional<Account> accountOpt = accountService.getAccountById(accountId);

        if (!accountOpt.has_value()) {
            throw NotFoundException("Account not found.");
        }

        Account account = accountOpt.value();

        // Authorization check: Only owner or admin can view account
        if (userDetails->userId != account.ownerUserId && userDetails->role != nlohmann::json(UserRole::Admin).dump()) {
            throw ForbiddenException("Access denied to this account.");
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Pistache::Http::Code::Ok, account.toJson().dump());
        Logger::get()->info("Account {} retrieved by user {}.", accountId, userDetails->userId);

    } catch (const std::runtime_error& e) { // For param parsing errors
        response.send(Pistache::Http::Code::Bad_Request, "Invalid account ID format.");
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error getting account by ID: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

void AccountController::updateAccount(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        auto userDetails = AuthController::getAuthenticatedUserDetails(request);
        if (!userDetails || userDetails->role != nlohmann::json(UserRole::Admin).dump()) {
            throw ForbiddenException("Only administrators can update accounts.");
        }

        long accountId = request.param(":id").as<long>();
        nlohmann::json body = nlohmann::json::parse(request.body());

        std::string newAccountName = body.value("accountName", "");
        std::string newCurrency = body.value("currency", "");

        Account updatedAccount = accountService.updateAccount(accountId, newAccountName, newCurrency);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Pistache::Http::Code::Ok, updatedAccount.toJson().dump());
        Logger::get()->info("Account {} updated by admin {}.", accountId, userDetails->userId);

    } catch (const nlohmann::json::exception& e) {
        Logger::get()->warn("JSON parsing error in updateAccount: {}", e.what());
        response.send(Pistache::Http::Code::Bad_Request, "Invalid JSON body: " + std::string(e.what()));
    } catch (const std::runtime_error& e) {
        response.send(Pistache::Http::Code::Bad_Request, "Invalid account ID format.");
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error updating account: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

void AccountController::deleteAccount(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        auto userDetails = AuthController::getAuthenticatedUserDetails(request);
        if (!userDetails || userDetails->role != nlohmann::json(UserRole::Admin).dump()) {
            throw ForbiddenException("Only administrators can delete accounts.");
        }

        long accountId = request.param(":id").as<long>();
        accountService.deleteAccount(accountId);

        response.send(Pistache::Http::Code::No_Content);
        Logger::get()->info("Account {} deleted by admin {}.", accountId, userDetails->userId);

    } catch (const std::runtime_error& e) {
        response.send(Pistache::Http::Code::Bad_Request, "Invalid account ID format.");
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error deleting account: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

void AccountController::getAccountsForUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        auto userDetails = AuthController::getAuthenticatedUserDetails(request);
        if (!userDetails) {
            throw UnauthorizedException();
        }

        long userIdParam;
        try {
            userIdParam = request.param(":userId").as<long>();
        } catch (const std::runtime_error&) {
            throw BadRequestException("Invalid user ID format.");
        }

        // Authorization check: User can only view their own accounts unless they are an admin
        if (userDetails->userId != userIdParam && userDetails->role != nlohmann::json(UserRole::Admin).dump()) {
            throw ForbiddenException("Access denied to view other users' accounts.");
        }

        std::vector<Account> accounts = accountService.getAccountsByUserId(userIdParam);

        nlohmann::json respBody = nlohmann::json::array();
        for (const auto& acc : accounts) {
            respBody.push_back(acc.toJson());
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Pistache::Http::Code::Ok, respBody.dump());
        Logger::get()->info("Accounts for user {} retrieved by user {}.", userIdParam, userDetails->userId);

    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error getting accounts for user: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

void AccountController::deposit(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        auto userDetails = AuthController::getAuthenticatedUserDetails(request);
        if (!userDetails || (userDetails->role != nlohmann::json(UserRole::Customer).dump() && userDetails->role != nlohmann::json(UserRole::Merchant).dump())) {
            throw ForbiddenException("Only customers and merchants can make deposits.");
        }

        long accountId = request.param(":id").as<long>();
        nlohmann::json body = nlohmann::json::parse(request.body());
        double amount = body.at("amount").get<double>();

        if (amount <= 0) {
            throw BadRequestException("Deposit amount must be positive.");
        }

        // Validate that the account belongs to the authenticated user
        std::optional<Account> accountOpt = accountService.getAccountById(accountId);
        if (!accountOpt.has_value() || accountOpt->ownerUserId != userDetails->userId) {
            throw ForbiddenException("Access denied or account not found.");
        }

        Account updatedAccount = accountService.deposit(accountId, amount);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Pistache::Http::Code::Ok, updatedAccount.toJson().dump());
        Logger::get()->info("Deposit of {} to account {} by user {}.", amount, accountId, userDetails->userId);

    } catch (const nlohmann::json::exception& e) {
        Logger::get()->warn("JSON parsing error in deposit: {}", e.what());
        response.send(Pistache::Http::Code::Bad_Request, "Invalid JSON body: " + std::string(e.what()));
    } catch (const std::runtime_error& e) {
        response.send(Pistache::Http::Code::Bad_Request, "Invalid account ID or amount format.");
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error depositing to account: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}

void AccountController::withdraw(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        auto userDetails = AuthController::getAuthenticatedUserDetails(request);
        if (!userDetails || (userDetails->role != nlohmann::json(UserRole::Customer).dump() && userDetails->role != nlohmann::json(UserRole::Merchant).dump())) {
            throw ForbiddenException("Only customers and merchants can make withdrawals.");
        }

        long accountId = request.param(":id").as<long>();
        nlohmann::json body = nlohmann::json::parse(request.body());
        double amount = body.at("amount").get<double>();

        if (amount <= 0) {
            throw BadRequestException("Withdrawal amount must be positive.");
        }

        // Validate that the account belongs to the authenticated user
        std::optional<Account> accountOpt = accountService.getAccountById(accountId);
        if (!accountOpt.has_value() || accountOpt->ownerUserId != userDetails->userId) {
            throw ForbiddenException("Access denied or account not found.");
        }

        Account updatedAccount = accountService.withdraw(accountId, amount);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Pistache::Http::Code::Ok, updatedAccount.toJson().dump());
        Logger::get()->info("Withdrawal of {} from account {} by user {}.", amount, accountId, userDetails->userId);

    } catch (const nlohmann::json::exception& e) {
        Logger::get()->warn("JSON parsing error in withdraw: {}", e.what());
        response.send(Pistache::Http::Code::Bad_Request, "Invalid JSON body: " + std::string(e.what()));
    } catch (const std::runtime_error& e) {
        response.send(Pistache::Http::Code::Bad_Request, "Invalid account ID or amount format.");
    } catch (const ApiException& e) {
        response.send(e.getStatusCode(), e.what());
    } catch (const std::exception& e) {
        Logger::get()->error("Error withdrawing from account: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, "Internal server error.");
    }
}
```