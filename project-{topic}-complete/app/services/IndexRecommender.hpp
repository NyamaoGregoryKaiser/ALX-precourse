```cpp
#ifndef INDEX_RECOMMENDER_HPP
#define INDEX_RECOMMENDER_HPP

#include <string>
#include <vector>
#include <set>
#include "Poco/JSON/Object.h"
#include "Poco/Data/Session.h"

// Forward declaration
class PostgreSQLAdapter;

struct IndexRecommendation {
    std::string type; // e.g., "B-TREE"
    std::string table_name;
    std::string columns; // Comma-separated
    std::string rationale;
    std::string suggested_ddl; // CREATE INDEX ...
};

class IndexRecommender {
public:
    IndexRecommender(PostgreSQLAdapter* dbAdapter);

    // Recommends indexes based on analyzed query and its EXPLAIN ANALYZE plan
    std::vector<IndexRecommendation> recommendIndexes(
        const Poco::JSON::Object::Ptr& analyzedQuery,
        const std::string& explainAnalyzeOutput,
        int monitoredDbId
    );

    // Retrieves existing indexes for a given table from the monitored database
    std::set<std::string> getExistingIndexes(int monitoredDbId, const std::string& tableName);

private:
    PostgreSQLAdapter* _dbAdapter;

    // Parses EXPLAIN ANALYZE output for specific patterns (e.g., sequential scans)
    std::vector<std::string> parseExplainAnalyzeForSequentialScans(const std::string& explainAnalyzeOutput);

    // Generates a CREATE INDEX DDL statement
    std::string generateCreateIndexDDL(const std::string& tableName, const std::string& columns, const std::string& indexNameSuffix);

    // Determines if a suggested index already exists or is redundant
    bool isIndexRedundant(const std::string& tableName, const std::string& columns, const std::set<std::string>& existingIndexes);
};

#endif // INDEX_RECOMMENDER_HPP
```