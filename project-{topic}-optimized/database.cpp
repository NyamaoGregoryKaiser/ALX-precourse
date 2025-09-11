```cpp
#include "database.h"
#include <iostream>
#include <sqlite3.h>

// ... (Implementation of Database class using SQLite3) ...
// This would include functions for creating tables, inserting/retrieving data, etc.

//Example insert
bool Database::insertData(const std::string& url, const std::string& content) {
    sqlite3_stmt *stmt;
    std::string sql = "INSERT INTO scraped_data (url, content) VALUES (?, ?);";
    int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, 0);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << sqlite3_errmsg(db) << std::endl;
        sqlite3_finalize(stmt);
        return false;
    }
    sqlite3_bind_text(stmt, 1, url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, content.c_str(), -1, SQLITE_TRANSIENT);
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        std::cerr << "SQL error: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    return true;
}

```