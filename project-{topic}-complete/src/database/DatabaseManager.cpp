```cpp
#include "DatabaseManager.h"
#include <iostream>
#include <stdexcept>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace PaymentProcessor {
namespace Database {

DatabaseManager& DatabaseManager::getInstance() {
    static DatabaseManager instance;
    return instance;
}

void DatabaseManager::init(const std::string& dbPath) {
    try {
        db = std::make_unique<sqlite3pp::database>(dbPath.c_str());
        LOG_INFO("Database opened successfully: {}", dbPath);
        createTables();
        LOG_INFO("Database tables ensured.");
    } catch (const sqlite3pp::database_error& e) {
        LOG_CRITICAL("Failed to open or initialize database {}: {}", dbPath, e.what());
        throw DatabaseException("Failed to open or initialize database: " + std::string(e.what()));
    }
}

std::string DatabaseManager::getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&now_c), "%Y-%m-%dT%H:%M:%SZ"); // ISO 8601 UTC
    return ss.str();
}

void DatabaseManager::createTables() {
    if (!db) {
        throw DatabaseException("Database is not initialized.");
    }

    try {
        // Users Table
        db->exec("CREATE TABLE IF NOT EXISTS users ("
                 "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                 "username TEXT UNIQUE NOT NULL,"
                 "password_hash TEXT NOT NULL,"
                 "email TEXT UNIQUE NOT NULL,"
                 "role TEXT NOT NULL," // e.g., 'ADMIN', 'MERCHANT'
                 "created_at TEXT NOT NULL,"
                 "updated_at TEXT NOT NULL"
                 ");");

        // Accounts Table
        db->exec("CREATE TABLE IF NOT EXISTS accounts ("
                 "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                 "user_id INTEGER NOT NULL,"
                 "name TEXT NOT NULL,"
                 "currency TEXT NOT NULL,"
                 "balance REAL NOT NULL DEFAULT 0.0,"
                 "status TEXT NOT NULL," // e.g., 'ACTIVE', 'INACTIVE'
                 "created_at TEXT NOT NULL,"
                 "updated_at TEXT NOT NULL,"
                 "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
                 ");");

        // Transactions Table
        db->exec("CREATE TABLE IF NOT EXISTS transactions ("
                 "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                 "account_id INTEGER NOT NULL,"
                 "external_id TEXT UNIQUE," // Transaction ID from external gateway
                 "type TEXT NOT NULL,"       // e.g., 'PAYMENT', 'REFUND'
                 "amount REAL NOT NULL,"
                 "currency TEXT NOT NULL,"
                 "status TEXT NOT NULL,"     // e.g., 'PENDING', 'COMPLETED', 'FAILED'
                 "description TEXT,"
                 "created_at TEXT NOT NULL,"
                 "updated_at TEXT NOT NULL,"
                 "FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE"
                 ");");

        LOG_DEBUG("All necessary tables (users, accounts, transactions) are created or already exist.");
    } catch (const sqlite3pp::database_error& e) {
        LOG_CRITICAL("Failed to create tables: {}", e.what());
        throw DatabaseException("Failed to create database tables: " + std::string(e.what()));
    }
}

// --- User Operations ---

long long DatabaseManager::createUser(const User& user) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Attempting to create user: {}", user.username);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "INSERT INTO users (username, password_hash, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
        cmd.bind(1, user.username, sqlite3pp::nocopy);
        cmd.bind(2, user.passwordHash, sqlite3pp::nocopy);
        cmd.bind(3, user.email, sqlite3pp::nocopy);
        cmd.bind(4, nlohmann::json(user.role).get<std::string>(), sqlite3pp::nocopy); // Convert enum to string
        std::string timestamp = getCurrentTimestamp();
        cmd.bind(5, timestamp, sqlite3pp::nocopy);
        cmd.bind(6, timestamp, sqlite3pp::nocopy);
        cmd.execute();
        xact.commit();
        long long new_id = db->last_insert_rowid();
        LOG_INFO("User {} created with ID: {}", user.username, new_id);
        return new_id;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to create user {}: {}", user.username, e.what());
        throw DatabaseException("Failed to create user: " + std::string(e.what()));
    }
}

std::optional<User> DatabaseManager::findUserById(long long id) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Finding user by ID: {}", id);
    try {
        sqlite3pp::query qry(*db, "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE id = ?");
        qry.bind(1, id);
        for (auto& row : qry) {
            std::string role_str;
            row.get_text(4, &role_str);
            return User(row.get<long long>(0), row.get<const char*>(1), row.get<const char*>(2),
                        row.get<const char*>(3), nlohmann::json(role_str).get<UserRole>(), // Convert string to enum
                        row.get<const char*>(5), row.get<const char*>(6));
        }
        LOG_DEBUG("User with ID {} not found.", id);
        return std::nullopt;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to find user by ID {}: {}", id, e.what());
        throw DatabaseException("Failed to find user by ID: " + std::string(e.what()));
    }
}

std::optional<User> DatabaseManager::findUserByUsername(const std::string& username) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Finding user by username: {}", username);
    try {
        sqlite3pp::query qry(*db, "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE username = ?");
        qry.bind(1, username, sqlite3pp::nocopy);
        for (auto& row : qry) {
            std::string role_str;
            row.get_text(4, &role_str);
            return User(row.get<long long>(0), row.get<const char*>(1), row.get<const char*>(2),
                        row.get<const char*>(3), nlohmann::json(role_str).get<UserRole>(),
                        row.get<const char*>(5), row.get<const char*>(6));
        }
        LOG_DEBUG("User with username {} not found.", username);
        return std::nullopt;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to find user by username {}: {}", username, e.what());
        throw DatabaseException("Failed to find user by username: " + std::string(e.what()));
    }
}

bool DatabaseManager::updateUser(const User& user) {
    if (!db) throw DatabaseException("Database not initialized.");
    if (!user.id) {
        LOG_ERROR("Attempted to update user without an ID.");
        throw InvalidArgumentException("User ID is required for update.");
    }
    LOG_DEBUG("Updating user ID: {}", *user.id);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "UPDATE users SET username = ?, password_hash = ?, email = ?, role = ?, updated_at = ? WHERE id = ?");
        cmd.bind(1, user.username, sqlite3pp::nocopy);
        cmd.bind(2, user.passwordHash, sqlite3pp::nocopy);
        cmd.bind(3, user.email, sqlite3pp::nocopy);
        cmd.bind(4, nlohmann::json(user.role).get<std::string>(), sqlite3pp::nocopy);
        cmd.bind(5, getCurrentTimestamp(), sqlite3pp::nocopy);
        cmd.bind(6, *user.id);
        cmd.execute();
        xact.commit();
        bool success = (db->changes() > 0);
        if (success) LOG_INFO("User ID {} updated successfully.", *user.id);
        else LOG_WARN("User ID {} not found for update.", *user.id);
        return success;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to update user ID {}: {}", *user.id, e.what());
        throw DatabaseException("Failed to update user: " + std::string(e.what()));
    }
}

bool DatabaseManager::deleteUser(long long id) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Deleting user ID: {}", id);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "DELETE FROM users WHERE id = ?");
        cmd.bind(1, id);
        cmd.execute();
        xact.commit();
        bool success = (db->changes() > 0);
        if (success) LOG_INFO("User ID {} deleted successfully.", id);
        else LOG_WARN("User ID {} not found for deletion.", id);
        return success;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to delete user ID {}: {}", id, e.what());
        throw DatabaseException("Failed to delete user: " + std::string(e.what()));
    }
}

std::vector<User> DatabaseManager::getAllUsers() {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Retrieving all users.");
    std::vector<User> users;
    try {
        sqlite3pp::query qry(*db, "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users");
        for (auto& row : qry) {
            std::string role_str;
            row.get_text(4, &role_str);
            users.emplace_back(row.get<long long>(0), row.get<const char*>(1), row.get<const char*>(2),
                               row.get<const char*>(3), nlohmann::json(role_str).get<UserRole>(),
                               row.get<const char*>(5), row.get<const char*>(6));
        }
        LOG_DEBUG("Retrieved {} users.", users.size());
        return users;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to get all users: {}", e.what());
        throw DatabaseException("Failed to get all users: " + std::string(e.what()));
    }
}

// --- Account Operations ---

long long DatabaseManager::createAccount(const Account& account) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Attempting to create account for user ID {}: {}", account.userId, account.name);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "INSERT INTO accounts (user_id, name, currency, balance, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
        cmd.bind(1, account.userId);
        cmd.bind(2, account.name, sqlite3pp::nocopy);
        cmd.bind(3, account.currency, sqlite3pp::nocopy);
        cmd.bind(4, account.balance);
        cmd.bind(5, account.status, sqlite3pp::nocopy);
        std::string timestamp = getCurrentTimestamp();
        cmd.bind(6, timestamp, sqlite3pp::nocopy);
        cmd.bind(7, timestamp, sqlite3pp::nocopy);
        cmd.execute();
        xact.commit();
        long long new_id = db->last_insert_rowid();
        LOG_INFO("Account {} created for user ID {} with ID: {}", account.name, account.userId, new_id);
        return new_id;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to create account for user ID {}: {}", account.userId, e.what());
        throw DatabaseException("Failed to create account: " + std::string(e.what()));
    }
}

std::optional<Account> DatabaseManager::findAccountById(long long id) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Finding account by ID: {}", id);
    try {
        sqlite3pp::query qry(*db, "SELECT id, user_id, name, currency, balance, status, created_at, updated_at FROM accounts WHERE id = ?");
        qry.bind(1, id);
        for (auto& row : qry) {
            return Account(row.get<long long>(0), row.get<long long>(1), row.get<const char*>(2),
                           row.get<const char*>(3), row.get<double>(4), row.get<const char*>(5),
                           row.get<const char*>(6), row.get<const char*>(7));
        }
        LOG_DEBUG("Account with ID {} not found.", id);
        return std::nullopt;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to find account by ID {}: {}", id, e.what());
        throw DatabaseException("Failed to find account by ID: " + std::string(e.what()));
    }
}

std::vector<Account> DatabaseManager::findAccountsByUserId(long long userId) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Finding accounts for user ID: {}", userId);
    std::vector<Account> accounts;
    try {
        sqlite3pp::query qry(*db, "SELECT id, user_id, name, currency, balance, status, created_at, updated_at FROM accounts WHERE user_id = ?");
        qry.bind(1, userId);
        for (auto& row : qry) {
            accounts.emplace_back(row.get<long long>(0), row.get<long long>(1), row.get<const char*>(2),
                                  row.get<const char*>(3), row.get<double>(4), row.get<const char*>(5),
                                  row.get<const char*>(6), row.get<const char*>(7));
        }
        LOG_DEBUG("Found {} accounts for user ID {}.", accounts.size(), userId);
        return accounts;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to find accounts for user ID {}: {}", userId, e.what());
        throw DatabaseException("Failed to find accounts by user ID: " + std::string(e.what()));
    }
}

bool DatabaseManager::updateAccount(const Account& account) {
    if (!db) throw DatabaseException("Database not initialized.");
    if (!account.id) {
        LOG_ERROR("Attempted to update account without an ID.");
        throw InvalidArgumentException("Account ID is required for update.");
    }
    LOG_DEBUG("Updating account ID: {}", *account.id);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "UPDATE accounts SET name = ?, currency = ?, balance = ?, status = ?, updated_at = ? WHERE id = ?");
        cmd.bind(1, account.name, sqlite3pp::nocopy);
        cmd.bind(2, account.currency, sqlite3pp::nocopy);
        cmd.bind(3, account.balance);
        cmd.bind(4, account.status, sqlite3pp::nocopy);
        cmd.bind(5, getCurrentTimestamp(), sqlite3pp::nocopy);
        cmd.bind(6, *account.id);
        cmd.execute();
        xact.commit();
        bool success = (db->changes() > 0);
        if (success) LOG_INFO("Account ID {} updated successfully.", *account.id);
        else LOG_WARN("Account ID {} not found for update.", *account.id);
        return success;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to update account ID {}: {}", *account.id, e.what());
        throw DatabaseException("Failed to update account: " + std::string(e.what()));
    }
}

bool DatabaseManager::deleteAccount(long long id) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Deleting account ID: {}", id);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "DELETE FROM accounts WHERE id = ?");
        cmd.bind(1, id);
        cmd.execute();
        xact.commit();
        bool success = (db->changes() > 0);
        if (success) LOG_INFO("Account ID {} deleted successfully.", id);
        else LOG_WARN("Account ID {} not found for deletion.", id);
        return success;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to delete account ID {}: {}", id, e.what());
        throw DatabaseException("Failed to delete account: " + std::string(e.what()));
    }
}

// --- Transaction Operations ---

long long DatabaseManager::createTransaction(const Transaction& transaction) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Attempting to create transaction for account ID {}: {}", transaction.accountId, transaction.description);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "INSERT INTO transactions (account_id, external_id, type, amount, currency, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        cmd.bind(1, transaction.accountId);
        cmd.bind(2, transaction.externalId, sqlite3pp::nocopy);
        cmd.bind(3, nlohmann::json(transaction.type).get<std::string>(), sqlite3pp::nocopy);
        cmd.bind(4, transaction.amount);
        cmd.bind(5, transaction.currency, sqlite3pp::nocopy);
        cmd.bind(6, nlohmann::json(transaction.status).get<std::string>(), sqlite3pp::nocopy);
        cmd.bind(7, transaction.description, sqlite3pp::nocopy);
        std::string timestamp = getCurrentTimestamp();
        cmd.bind(8, timestamp, sqlite3pp::nocopy);
        cmd.bind(9, timestamp, sqlite3pp::nocopy);
        cmd.execute();
        xact.commit();
        long long new_id = db->last_insert_rowid();
        LOG_INFO("Transaction ID {} created for account ID {}.", new_id, transaction.accountId);
        return new_id;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to create transaction for account ID {}: {}", transaction.accountId, e.what());
        throw DatabaseException("Failed to create transaction: " + std::string(e.what()));
    }
}

std::optional<Transaction> DatabaseManager::findTransactionById(long long id) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Finding transaction by ID: {}", id);
    try {
        sqlite3pp::query qry(*db, "SELECT id, account_id, external_id, type, amount, currency, status, description, created_at, updated_at FROM transactions WHERE id = ?");
        qry.bind(1, id);
        for (auto& row : qry) {
            std::string type_str, status_str;
            row.get_text(3, &type_str);
            row.get_text(6, &status_str);
            return Transaction(row.get<long long>(0), row.get<long long>(1), row.get<const char*>(2),
                               nlohmann::json(type_str).get<TransactionType>(), row.get<double>(4),
                               row.get<const char*>(5), nlohmann::json(status_str).get<TransactionStatus>(),
                               row.get<const char*>(7), row.get<const char*>(8), row.get<const char*>(9));
        }
        LOG_DEBUG("Transaction with ID {} not found.", id);
        return std::nullopt;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to find transaction by ID {}: {}", id, e.what());
        throw DatabaseException("Failed to find transaction by ID: " + std::string(e.what()));
    }
}

std::vector<Transaction> DatabaseManager::findTransactionsByAccountId(long long accountId, int limit, int offset) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Finding transactions for account ID {}. Limit: {}, Offset: {}", accountId, limit, offset);
    std::vector<Transaction> transactions;
    try {
        sqlite3pp::query qry(*db, "SELECT id, account_id, external_id, type, amount, currency, status, description, created_at, updated_at FROM transactions WHERE account_id = ? LIMIT ? OFFSET ?");
        qry.bind(1, accountId);
        qry.bind(2, limit);
        qry.bind(3, offset);
        for (auto& row : qry) {
            std::string type_str, status_str;
            row.get_text(3, &type_str);
            row.get_text(6, &status_str);
            transactions.emplace_back(row.get<long long>(0), row.get<long long>(1), row.get<const char*>(2),
                                      nlohmann::json(type_str).get<TransactionType>(), row.get<double>(4),
                                      row.get<const char*>(5), nlohmann::json(status_str).get<TransactionStatus>(),
                                      row.get<const char*>(7), row.get<const char*>(8), row.get<const char*>(9));
        }
        LOG_DEBUG("Found {} transactions for account ID {}.", transactions.size(), accountId);
        return transactions;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to find transactions for account ID {}: {}", accountId, e.what());
        throw DatabaseException("Failed to find transactions by account ID: " + std::string(e.what()));
    }
}

bool DatabaseManager::updateTransactionStatus(long long id, TransactionStatus status) {
    if (!db) throw DatabaseException("Database not initialized.");
    LOG_DEBUG("Updating transaction ID {} status to {}.", id, nlohmann::json(status).get<std::string>());
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?");
        cmd.bind(1, nlohmann::json(status).get<std::string>(), sqlite3pp::nocopy);
        cmd.bind(2, getCurrentTimestamp(), sqlite3pp::nocopy);
        cmd.bind(3, id);
        cmd.execute();
        xact.commit();
        bool success = (db->changes() > 0);
        if (success) LOG_INFO("Transaction ID {} status updated to {}.", id, nlohmann::json(status).get<std::string>());
        else LOG_WARN("Transaction ID {} not found for status update.", id);
        return success;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to update transaction ID {} status: {}", id, e.what());
        throw DatabaseException("Failed to update transaction status: " + std::string(e.what()));
    }
}

bool DatabaseManager::updateTransaction(const Transaction& transaction) {
    if (!db) throw DatabaseException("Database not initialized.");
    if (!transaction.id) {
        LOG_ERROR("Attempted to update transaction without an ID.");
        throw InvalidArgumentException("Transaction ID is required for update.");
    }
    LOG_DEBUG("Updating transaction ID: {}", *transaction.id);
    try {
        sqlite3pp::transaction xact(*db);
        sqlite3pp::command cmd(*db, "UPDATE transactions SET account_id = ?, external_id = ?, type = ?, amount = ?, currency = ?, status = ?, description = ?, updated_at = ? WHERE id = ?");
        cmd.bind(1, transaction.accountId);
        cmd.bind(2, transaction.externalId, sqlite3pp::nocopy);
        cmd.bind(3, nlohmann::json(transaction.type).get<std::string>(), sqlite3pp::nocopy);
        cmd.bind(4, transaction.amount);
        cmd.bind(5, transaction.currency, sqlite3pp::nocopy);
        cmd.bind(6, nlohmann::json(transaction.status).get<std::string>(), sqlite3pp::nocopy);
        cmd.bind(7, transaction.description, sqlite3pp::nocopy);
        cmd.bind(8, getCurrentTimestamp(), sqlite3pp::nocopy);
        cmd.bind(9, *transaction.id);
        cmd.execute();
        xact.commit();
        bool success = (db->changes() > 0);
        if (success) LOG_INFO("Transaction ID {} updated successfully.", *transaction.id);
        else LOG_WARN("Transaction ID {} not found for update.", *transaction.id);
        return success;
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to update transaction ID {}: {}", *transaction.id, e.what());
        throw DatabaseException("Failed to update transaction: " + std::string(e.what()));
    }
}


} // namespace Database
} // namespace PaymentProcessor
```