```cpp
#ifndef DATABASE_H
#define DATABASE_H

#include <string>

class Database {
public:
  Database(const std::string& filename);
  ~Database();
  bool createTables();
  bool insertData(const std::string& url, const std::string& content);
  // ... other database functions ...

private:
  sqlite3* db;
};

#endif
```