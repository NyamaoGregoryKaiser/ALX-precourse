```cpp
#include "AccountController.h"
#include <nlohmann/json.hpp>

namespace PaymentProcessor {
namespace Controllers {

crow::response AccountController::createAccount(const crow::request& req, AuthContext& authContext) {
    LOG_INFO("Received request to create account by user ID {}.", authContext.userId);

    if (!authContext.isAuthenticated) {
        throw Exceptions::UnauthorizedException();
    }
    // Only ADMIN or MERCHANT users can create accounts
    if (authContext.userRole != "ADMIN" && authContext.userRole != "MERCHANT") {
        throw Exceptions::ForbiddenException("Only ADMIN or MERCHANT users can create accounts.");
    }

    auto jsonBody = nlohmann::json::parse(req.body);

    CreateAccountRequestDTO createDto;
    createDto.from_json(jsonBody);

    // For simplicity, we assume the user creating the account is also its owner.
    // In a real system, an ADMIN might create an account for another merchant user.
    // For now, if no userId is provided in DTO, use authenticated user's ID.
    if (createDto.userId == 0) { // Default value for `long long`
        createDto.userId = authContext.userId;
    } else {
        // If an ADMIN is creating an account for another user, additional checks needed
        if (authContext.userRole != "ADMIN" && createDto.userId != authContext.userId) {
            throw Exceptions::ForbiddenException("MERCHANT users cannot create accounts for other users.");
        }
        // An ADMIN could create an account for any user; for simplicity, we allow it if userId is provided.
    }


    Account newAccount = accountService.createAccount(createDto.userId, createDto.name, createDto.currency, createDto.initialBalance);
    LOG_INFO("Account '{}' (ID: {}) created for user ID {}.", newAccount.name, *newAccount.id, newAccount.userId);

    crow::response res(201); // Created
    res.set_header("Content-Type", "application/json");
    res.write(newAccount.toJson().dump());
    return res;
}

crow::response AccountController::getAccount(const crow::request& req, AuthContext& authContext, long long accountId) {
    LOG_INFO("Received request to get account ID {} by user ID {}.", accountId, authContext.userId);

    if (!authContext.isAuthenticated) {
        throw Exceptions::UnauthorizedException();
    }

    auto account_opt = accountService.getAccountById(accountId);
    if (!account_opt.has_value()) {
        throw Exceptions::NotFoundException("Account with ID " + std::to_string(accountId) + " not found.");
    }
    Account account = account_opt.value();

    // Authorization check: Only owner or ADMIN can view account
    if (authContext.userRole != "ADMIN" && account.userId != authContext.userId) {
        throw Exceptions::ForbiddenException("You do not have permission to view this account.");
    }

    LOG_INFO("Account ID {} retrieved for user ID {}.", accountId, authContext.userId);
    crow::response res(200); // OK
    res.set_header("Content-Type", "application/json");
    res.write(account.toJson().dump());
    return res;
}

crow::response AccountController::getMyAccounts(const crow::request& req, AuthContext& authContext) {
    LOG_INFO("Received request to get accounts for authenticated user ID {}.", authContext.userId);

    if (!authContext.isAuthenticated) {
        throw Exceptions::UnauthorizedException();
    }

    // For "my" accounts, the userId is always the authenticated user's ID
    std::vector<Account> accounts = accountService.getAccountsByUserId(authContext.userId);

    // No specific DTO for list response, just return an array
    nlohmann::json j_array = nlohmann::json::array();
    for (const auto& acc : accounts) {
        j_array.push_back(acc.toJson());
    }

    LOG_INFO("Retrieved {} accounts for user ID {}.", accounts.size(), authContext.userId);
    crow::response res(200); // OK
    res.set_header("Content-Type", "application/json");
    res.write(j_array.dump());
    return res;
}

crow::response AccountController::updateAccount(const crow::request& req, AuthContext& authContext, long long accountId) {
    LOG_INFO("Received request to update account ID {} by user ID {}.", accountId, authContext.userId);

    if (!authContext.isAuthenticated) {
        throw Exceptions::UnauthorizedException();
    }

    auto account_opt = accountService.getAccountById(accountId);
    if (!account_opt.has_value()) {
        throw Exceptions::NotFoundException("Account with ID " + std::to_string(accountId) + " not found for update.");
    }
    Account existingAccount = account_opt.value();

    // Authorization check: Only owner or ADMIN can update account
    if (authContext.userRole != "ADMIN" && existingAccount.userId != authContext.userId) {
        throw Exceptions::ForbiddenException("You do not have permission to update this account.");
    }

    auto jsonBody = nlohmann::json::parse(req.body);
    UpdateAccountRequestDTO updateDto;
    updateDto.from_json(jsonBody);

    Account updatedAccount = accountService.updateAccount(accountId, updateDto.name, updateDto.status);
    LOG_INFO("Account ID {} updated successfully by user ID {}.", accountId, authContext.userId);

    crow::response res(200); // OK
    res.set_header("Content-Type", "application/json");
    res.write(updatedAccount.toJson().dump());
    return res;
}

crow::response AccountController::deleteAccount(const crow::request& req, AuthContext& authContext, long long accountId) {
    LOG_INFO("Received request to delete account ID {} by user ID {}.", accountId, authContext.userId);

    if (!authContext.isAuthenticated) {
        throw Exceptions::UnauthorizedException();
    }

    auto account_opt = accountService.getAccountById(accountId);
    if (!account_opt.has_value()) {
        throw Exceptions::NotFoundException("Account with ID " + std::to_string(accountId) + " not found for deletion.");
    }
    Account existingAccount = account_opt.value();

    // Authorization check: Only ADMIN can delete account for others, owner can delete their own.
    if (authContext.userRole != "ADMIN" && existingAccount.userId != authContext.userId) {
        throw Exceptions::ForbiddenException("You do not have permission to delete this account.");
    }

    accountService.deleteAccount(accountId);
    LOG_INFO("Account ID {} deleted successfully by user ID {}.", accountId, authContext.userId);

    crow::response res(204); // No Content
    return res;
}

} // namespace Controllers
} // namespace PaymentProcessor
```