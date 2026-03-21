```cpp
#ifndef ACCOUNT_SERVICE_H
#define ACCOUNT_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include "../models/Account.h"
#include "../database/DatabaseManager.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace PaymentProcessor {
namespace Services {

using namespace PaymentProcessor::Models;
using namespace PaymentProcessor::Database;
using namespace PaymentProcessor::Exceptions;
using namespace PaymentProcessor::Utils;

class AccountService {
public:
    explicit AccountService(DatabaseManager& dbManager) : dbManager(dbManager) {}

    // Create a new merchant account
    Account createAccount(long long userId, const std::string& name, const std::string& currency, double initialBalance);

    // Get an account by its ID
    std::optional<Account> getAccountById(long long accountId);

    // Get all accounts for a specific user
    std::vector<Account> getAccountsByUserId(long long userId);

    // Update an existing account
    Account updateAccount(long long accountId, const std::string& name, const std::string& status);

    // Delete an account by its ID
    bool deleteAccount(long long accountId);

    // Update account balance (e.g., after a transaction)
    bool updateAccountBalance(long long accountId, double amountChange);

private:
    DatabaseManager& dbManager;
};

} // namespace Services
} // namespace PaymentProcessor

#endif // ACCOUNT_SERVICE_H
```