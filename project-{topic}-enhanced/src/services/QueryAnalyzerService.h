#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include "../models/IndexRecommendation.h"

// Forward declarations
class QueryLogRepository;
class IndexRecommendationRepository;

class QueryAnalyzerService {
public:
    QueryAnalyzerService(QueryLogRepository& queryLogRepo, IndexRecommendationRepository& indexRecRepo);

    // Analyzes recent queries to identify potential index improvements
    std::vector<IndexRecommendation> analyzeRecentQueries(int limit = 100);
    
    // Takes a single query and suggests indexes (could be used for EXPLAIN ANALYZE integration)
    std::vector<IndexRecommendation> suggestIndexesForQuery(const std::string& query_text);

private:
    QueryLogRepository& queryLogRepo_;
    IndexRecommendationRepository& indexRecRepo_;

    // Helper to parse query text for WHERE/ORDER BY clauses
    std::map<std::string, std::vector<std::string>> parseQueryForColumns(const std::string& query_text);
    // Placeholder for actual database schema introspection to check existing indexes
    bool hasExistingIndex(const std::string& table_name, const std::string& column_name);
};
```