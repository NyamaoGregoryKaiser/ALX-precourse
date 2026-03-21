```cpp
#ifndef DATABASE_MANAGER_H
#define DATABASE_MANAGER_H

#include <string>
#include <memory>
#include <vector>
#include <sqlite3pp.h> // SQLite C++ wrapper
#include "../models/User.h"
#include "../models/Account.h"
#include "../models/Transaction.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace PaymentProcessor {
namespace Database {

using namespace PaymentProcessor::Models;
using namespace PaymentProcessor::Exceptions;
using namespace PaymentProcessor::Utils;

class DatabaseManager {
public:
    static DatabaseManager& getInstance();

    // Initialize database connection and schema
    void init(const std::string& dbPath);

    // --- User Operations ---
    long long createUser(const User& user);
    std::optional<User> findUserById(long long id);
    std::optional<User> findUserByUsername(const std::string& username);
    bool updateUser(const User& user);
    bool deleteUser(long long id);
    std::vector<User> getAllUsers();

    // --- Account Operations ---
    long long createAccount(const Account& account);
    std::optional<Account> findAccountById(long long id);
    std::vector<Account> findAccountsByUserId(long long userId);
    bool updateAccount(const Account& account);
    bool deleteAccount(long long id);

    // --- Transaction Operations ---
    long long createTransaction(const Transaction& transaction);
    std::optional<Transaction> findTransactionById(long long id);
    std::vector<Transaction> findTransactionsByAccountId(long long accountId, int limit, int offset);
    bool updateTransactionStatus(long long id, TransactionStatus status);
    bool updateTransaction(const Transaction& transaction); // For full update

private:
    DatabaseManager() = default;
    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    std::unique_ptr<sqlite3pp::database> db;

    void createTables();
    std::string getCurrentTimestamp();
};

} // namespace Database
} // namespace PaymentProcessor

#endif // DATABASE_MANAGER_H
```