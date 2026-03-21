```cpp
#include "TransactionController.h"
#include <nlohmann/json.hpp>

namespace PaymentProcessor {
namespace Controllers {

crow::response TransactionController::processTransaction(const crow::request& req, AuthContext& authContext) {
    LOG_INFO("Received request to process transaction by user ID {}.", authContext.userId);

    if (!authContext.isAuthenticated) {
        throw UnauthorizedException();
    }
    if (authContext.userRole != "ADMIN" && authContext.userRole != "MERCHANT") {
        throw ForbiddenException("Only ADMIN or MERCHANT users can process transactions.");
    }

    auto jsonBody = nlohmann::json::parse(req.body);
    ProcessTransactionRequestDTO processDto;
    processDto.from_json(jsonBody);

    // Authorization check: User can only process transactions for their own accounts (unless ADMIN)
    auto account_opt = accountService.getAccountById(processDto.accountId);
    if (!account_opt.has_value()) {
        throw NotFoundException("Target account with ID " + std::to_string(processDto.accountId) + " not found.");
    }
    if (authContext.userRole != "ADMIN" && account_opt->userId != authContext.userId) {
        throw ForbiddenException("You do not have permission to process transactions for this account.");
    }

    // Convert string type to enum
    TransactionType type;
    if (processDto.type == "PAYMENT") type = TransactionType::PAYMENT;
    else if (processDto.type == "REFUND") type = TransactionType::REFUND;
    else if (processDto.type == "WITHDRAWAL") type = TransactionType::WITHDRAWAL;
    else if (processDto.type == "DEPOSIT") type = TransactionType::DEPOSIT;
    else {
        LOG_WARN("Invalid transaction type specified: {}", processDto.type);
        return crow::response(400, nlohmann::json{{"error", "Invalid transaction type specified."}}.dump());
    }

    Transaction newTransaction = transactionService.processTransaction(
        processDto.accountId, processDto.externalId, type, processDto.amount, processDto.currency, processDto.description
    );
    LOG_INFO("Transaction ID {} (Type: {}) processed for account ID {}.", *newTransaction.id, processDto.type, newTransaction.accountId);

    crow::response res(201); // Created
    res.set_header("Content-Type", "application/json");
    res.write(newTransaction.toJson().dump());
    return res;
}

crow::response TransactionController::getTransaction(const crow::request& req, AuthContext& authContext, long long transactionId) {
    LOG_INFO("Received request to get transaction ID {} by user ID {}.", transactionId, authContext.userId);

    if (!authContext.isAuthenticated) {
        throw UnauthorizedException();
    }

    auto transaction_opt = transactionService.getTransactionById(transactionId);
    if (!transaction_opt.has_value()) {
        throw NotFoundException("Transaction with ID " + std::to_string(transactionId) + " not found.");
    }
    Transaction transaction = transaction_opt.value();

    // Authorization check: Only owner of the account or ADMIN can view
    auto account_opt = accountService.getAccountById(transaction.accountId);
    if (!account_opt.has_value()) {
        LOG_ERROR("Account ID {} linked to transaction ID {} not found. Data inconsistency.", transaction.accountId, transactionId);
        throw PaymentProcessorException("Internal data inconsistency detected.");
    }
    if (authContext.userRole != "ADMIN" && account_opt->userId != authContext.userId) {
        throw ForbiddenException("You do not have permission to view this transaction.");
    }

    LOG_INFO("Transaction ID {} retrieved for user ID {}.", transactionId, authContext.userId);
    crow::response res(200); // OK
    res.set_header("Content-Type", "application/json");
    res.write(transaction.toJson().dump());
    return res;
}

crow::response TransactionController::getTransactionsByAccount(const crow::request& req, AuthContext& authContext, long long accountId) {
    LOG_INFO("Received request to get transactions for account ID {} by user ID {}.", accountId, authContext.userId);

    if (!authContext.isAuthenticated) {
        throw UnauthorizedException();
    }

    // Authorization check: Only owner of the account or ADMIN can view its transactions
    auto account_opt = accountService.getAccountById(accountId);
    if (!account_opt.has_value()) {
        throw NotFoundException("Account with ID " + std::to_string(accountId) + " not found.");
    }
    if (authContext.userRole != "ADMIN" && account_opt->userId != authContext.userId) {
        throw ForbiddenException("You do not have permission to view transactions for this account.");
    }

    int page = req.url_params.get_parsed_value("page", 1);
    int pageSize = req.url_params.get_parsed_value("pageSize", 20);

    PaginatedResponseDTO<Transaction> paginatedResponse = transactionService.getTransactionsByAccountId(accountId, page, pageSize);
    LOG_INFO("Retrieved {} transactions (page {}, size {}) for account ID {} by user ID {}.",
             paginatedResponse.items.size(), paginatedResponse.page, paginatedResponse.pageSize, accountId, authContext.userId);

    crow::response res(200); // OK
    res.set_header("Content-Type", "application/json");
    res.write(paginatedResponse.toJson().dump());
    return res;
}

crow::response TransactionController::updateTransactionStatus(const crow::request& req, AuthContext& authContext, long long transactionId) {
    LOG_INFO("Received request to update transaction ID {} status by user ID {}.", transactionId, authContext.userId);

    if (!authContext.isAuthenticated) {
        throw UnauthorizedException();
    }
    if (authContext.userRole != "ADMIN" && authContext.userRole != "MERCHANT") { // Depending on policy, maybe only ADMIN/SYSTEM should do this
        throw ForbiddenException("Only ADMIN or MERCHANT users can update transaction status.");
    }

    auto transaction_opt = transactionService.getTransactionById(transactionId);
    if (!transaction_opt.has_value()) {
        throw NotFoundException("Transaction with ID " + std::to_string(transactionId) + " not found for status update.");
    }
    Transaction transaction = transaction_opt.value();

    // Authorization check for modifying transaction (must be owner or ADMIN)
    auto account_opt = accountService.getAccountById(transaction.accountId);
    if (!account_opt.has_value()) {
        LOG_ERROR("Account ID {} linked to transaction ID {} not found. Data inconsistency.", transaction.accountId, transactionId);
        throw PaymentProcessorException("Internal data inconsistency detected.");
    }
    if (authContext.userRole != "ADMIN" && account_opt->userId != authContext.userId) {
        throw ForbiddenException("You do not have permission to update status of this transaction.");
    }

    auto jsonBody = nlohmann::json::parse(req.body);
    UpdateTransactionStatusRequestDTO updateDto;
    updateDto.from_json(jsonBody);

    TransactionStatus newStatus;
    if (updateDto.status == "PENDING") newStatus = TransactionStatus::PENDING;
    else if (updateDto.status == "COMPLETED") newStatus = TransactionStatus::COMPLETED;
    else if (updateDto.status == "FAILED") newStatus = TransactionStatus::FAILED;
    else if (updateDto.status == "REFUNDED") newStatus = TransactionStatus::REFUNDED;
    else if (updateDto.status == "CANCELLED") newStatus = TransactionStatus::CANCELLED;
    else {
        LOG_WARN("Invalid transaction status specified: {}", updateDto.status);
        return crow::response(400, nlohmann::json{{"error", "Invalid transaction status specified."}}.dump());
    }

    Transaction updatedTransaction = transactionService.updateTransactionStatus(transactionId, newStatus);
    LOG_INFO("Transaction ID {} status updated to {} by user ID {}.", transactionId, updateDto.status, authContext.userId);

    crow::response res(200); // OK
    res.set_header("Content-Type", "application/json");
    res.write(updatedTransaction.toJson().dump());
    return res;
}

crow::response TransactionController::initiateRefund(const crow::request& req, AuthContext& authContext, long long originalTransactionId) {
    LOG_INFO("Received request to initiate refund for transaction ID {} by user ID {}.", originalTransactionId, authContext.userId);

    if (!authContext.isAuthenticated) {
        throw UnauthorizedException();
    }
    if (authContext.userRole != "ADMIN" && authContext.userRole != "MERCHANT") {
        throw ForbiddenException("Only ADMIN or MERCHANT users can initiate refunds.");
    }

    auto originalTransaction_opt = transactionService.getTransactionById(originalTransactionId);
    if (!originalTransaction_opt.has_value()) {
        throw NotFoundException("Original transaction with ID " + std::to_string(originalTransactionId) + " not found for refund.");
    }
    Transaction originalTransaction = originalTransaction_opt.value();

    // Authorization check: User can only refund transactions for their own accounts (unless ADMIN)
    auto account_opt = accountService.getAccountById(originalTransaction.accountId);
    if (!account_opt.has_value()) {
        LOG_ERROR("Account ID {} linked to original transaction ID {} not found. Data inconsistency.", originalTransaction.accountId, originalTransactionId);
        throw PaymentProcessorException("Internal data inconsistency detected.");
    }
    if (authContext.userRole != "ADMIN" && account_opt->userId != authContext.userId) {
        throw ForbiddenException("You do not have permission to refund transactions for this account.");
    }

    auto jsonBody = nlohmann::json::parse(req.body);
    // Use ProcessTransactionRequestDTO for refund details, or create a specific RefundRequestDTO
    // For simplicity, let's assume we reuse parts of it or directly extract.
    // Assuming JSON contains "refundAmount", "refundExternalId", "description"
    double refundAmount = jsonBody.at("refundAmount").get<double>();
    std::string refundExternalId = jsonBody.at("refundExternalId").get<std::string>();
    std::string description = jsonBody.value("description", "");

    Transaction refundTxn = transactionService.refundTransaction(originalTransactionId, refundExternalId, refundAmount, description);
    LOG_INFO("Refund transaction ID {} initiated for original transaction ID {} by user ID {}.", *refundTxn.id, originalTransactionId, authContext.userId);

    crow::response res(201); // Created
    res.set_header("Content-Type", "application/json");
    res.write(refundTxn.toJson().dump());
    return res;
}

} // namespace Controllers
} // namespace PaymentProcessor
```