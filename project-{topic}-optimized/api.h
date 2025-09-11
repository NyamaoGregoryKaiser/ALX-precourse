```cpp
#ifndef API_H
#define API_H

#include "database.h"
#include "scraper.h"

class API {
public:
  API(Database& db, Scraper& scraper);
  void run(); //Starts API server

private:
  Database& db;
  Scraper& scraper;
  // ... API framework specific members ...
};

#endif
```