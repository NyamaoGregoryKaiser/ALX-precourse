```cpp
#ifndef QUERY_ANALYZER_HPP
#define QUERY_ANALYZER_HPP

#include <string>
#include <vector>
#include <set>
#include <map>
#include "Poco/JSON/Object.h"

// Represents a parsed SQL query component
struct QueryComponent {
    std::string type; // e.g., "SELECT", "FROM", "JOIN", "WHERE", "ORDER BY", "GROUP BY"
    std::string value; // The actual clause or expression
    // Potentially more detailed structures for AST-like representation
};

class QueryAnalyzer {
public:
    QueryAnalyzer();

    // Analyzes a raw SQL query string
    Poco::JSON::Object::Ptr analyzeQuery(const std::string& query);

    // Extracts tables involved in the query
    std::set<std::string> extractTables(const std::string& query);

    // Extracts columns used in WHERE, ORDER BY, GROUP BY clauses
    std::set<std::string> extractFilterSortGroupColumns(const std::string& query);

    // Extracts join conditions (e.g., "table1.col = table2.col")
    std::vector<std::string> extractJoinConditions(const std::string& query);

private:
    // Helper to find patterns using regex (simplified, real parser is complex)
    std::vector<std::string> findPattern(const std::string& text, const std::string& regexPattern, int groupIndex = 1);
};

#endif // QUERY_ANALYZER_HPP
```