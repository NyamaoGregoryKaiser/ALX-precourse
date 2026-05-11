#include "QueryAnalyzerService.h"
#include "../db/repositories/QueryLogRepository.h"
#include "../db/repositories/IndexRecommendationRepository.h"
#include "../models/QueryLog.h"
#include "../utils/Logger.h"
#include "../common/Constants.h"

#include <regex>
#include <set>
#include <algorithm>

QueryAnalyzerService::QueryAnalyzerService(QueryLogRepository& queryLogRepo, IndexRecommendationRepository& indexRecRepo)
    : queryLogRepo_(queryLogRepo), indexRecRepo_(indexRecRepo) {}

std::vector<IndexRecommendation> QueryAnalyzerService::analyzeRecentQueries(int limit) {
    LOG_INFO("Analyzing recent {} queries for optimization opportunities...", limit);
    std::vector<QueryLog> recent_queries = queryLogRepo_.findRecent(limit);
    std::vector<IndexRecommendation> new_recommendations;

    std::map<std::string, int> column_usage_count; // Tracks (table.column -> count)
    std::map<std::string, std::set<std::string>> tables_columns; // Tracks (table -> {columns})

    for (const auto& log : recent_queries) {
        if (!log.query_text.empty() && log.execution_time_ms > Config::get<double>("SLOW_QUERY_THRESHOLD_MS", 50.0)) {
            LOG_DEBUG("Analyzing slow query: {}", log.query_text);
            std::map<std::string, std::vector<std::string>> parsed_columns = parseQueryForColumns(log.query_text);

            for (const auto& pair : parsed_columns) {
                const std::string& table_name = pair.first;
                for (const std::string& column_name : pair.second) {
                    std::string full_column_name = table_name + "." + column_name;
                    column_usage_count[full_column_name]++;
                    tables_columns[table_name].insert(column_name);
                }
            }
        }
    }

    // Threshold for suggesting an index: used in X% of slow queries, or more than Y times
    int min_usage_count = Config::get<int>("MIN_INDEX_SUGGESTION_USAGE", 5);

    for (const auto& pair : column_usage_count) {
        if (pair.second >= min_usage_count) {
            std::string full_column = pair.first;
            size_t dot_pos = full_column.find('.');
            if (dot_pos == std::string::npos) continue; // Should not happen with current parsing

            std::string table_name = full_column.substr(0, dot_pos);
            std::string column_name = full_column.substr(dot_pos + 1);

            // Check if an index already exists (mocked)
            if (!hasExistingIndex(table_name, column_name)) {
                IndexRecommendation rec;
                rec.table_name = table_name;
                rec.column_name = column_name;
                rec.recommendation_type = "B-TREE INDEX";
                rec.description = "Consider adding a B-Tree index on " + table_name + "." + column_name +
                                  " due to frequent usage in WHERE/ORDER BY clauses in slow queries.";
                rec.status = "PENDING";
                rec.created_at = std::chrono::system_clock::now();
                rec.severity = "MEDIUM";
                rec.cost_savings = "High"; // Placeholder

                // Avoid duplicate recommendations for the same table.column
                if (!indexRecRepo_.findExisting(table_name, column_name)) {
                    indexRecRepo_.create(rec);
                    new_recommendations.push_back(rec);
                    LOG_INFO("New index recommendation: {} on {}.{}", rec.recommendation_type, rec.table_name, rec.column_name);
                }
            }
        }
    }
    LOG_INFO("Query analysis complete. Generated {} new recommendations.", new_recommendations.size());
    return new_recommendations;
}

std::vector<IndexRecommendation> QueryAnalyzerService::suggestIndexesForQuery(const std::string& query_text) {
    LOG_INFO("Suggesting indexes for single query: {}", query_text);
    std::vector<IndexRecommendation> suggestions;
    std::map<std::string, std::vector<std::string>> parsed_columns = parseQueryForColumns(query_text);

    for (const auto& pair : parsed_columns) {
        const std::string& table_name = pair.first;
        for (const std::string& column_name : pair.second) {
            if (!hasExistingIndex(table_name, column_name)) {
                IndexRecommendation rec;
                rec.table_name = table_name;
                rec.column_name = column_name;
                rec.recommendation_type = "B-TREE INDEX";
                rec.description = "Consider adding an index on " + table_name + "." + column_name +
                                  " based on its usage in the provided query.";
                rec.status = "SUGGESTED";
                rec.created_at = std::chrono::system_clock::now();
                rec.severity = "LOW"; // Lower severity for single query analysis
                suggestions.push_back(rec);
            }
        }
    }
    return suggestions;
}

std::map<std::string, std::vector<std::string>> QueryAnalyzerService::parseQueryForColumns(const std::string& query_text) {
    std::map<std::string, std::vector<std::string>> result;

    // Simple regex to extract table and column names from WHERE and ORDER BY clauses
    // This is a *very* simplified parser. A real parser would use a full SQL parser library.
    std::regex where_order_regex(R"((?:WHERE|ORDER BY)\s+([\w\d\._,\s=\<\>!'"]+))", std::regex::icase);
    std::smatch match;

    std::string::const_iterator search_start(query_text.cbegin());
    while (std::regex_search(search_start, query_text.cend(), match, where_order_regex)) {
        std::string clause_content = match[1].str();
        
        // Split by operators and commas to get potential column names
        std::regex column_split_regex(R"([\s=<>!']+|,|\bAND\b|\bOR\b|\bIN\b|\bLIKE\b)", std::regex::icase);
        std::sregex_token_iterator iter(clause_content.begin(), clause_content.end(), column_split_regex, -1);
        std::sregex_token_iterator end;

        for (; iter != end; ++iter) {
            std::string token = *iter;
            // Trim whitespace
            token.erase(0, token.find_first_not_of(" \t\n\r\f\v"));
            token.erase(token.find_last_not_of(" \t\n\r\f\v") + 1);

            if (!token.empty() && token.find('.') != std::string::npos &&
                token.find('(') == std::string::npos && token.find('\'') == std::string::npos) { // Crude check for function calls or string literals
                
                size_t dot_pos = token.find('.');
                std::string table = token.substr(0, dot_pos);
                std::string column = token.substr(dot_pos + 1);
                
                // Further clean: remove quotes if present e.g. "users"."id"
                if (table.length() > 1 && table.front() == '"' && table.back() == '"') {
                    table = table.substr(1, table.length() - 2);
                }
                if (column.length() > 1 && column.front() == '"' && column.back() == '"') {
                    column = column.substr(1, column.length() - 2);
                }

                if (!table.empty() && !column.empty()) {
                    result[table].push_back(column);
                }
            }
        }
        search_start = match.suffix().first;
    }

    // Deduplicate columns for each table
    for (auto& pair : result) {
        std::sort(pair.second.begin(), pair.second.end());
        pair.second.erase(std::unique(pair.second.begin(), pair.second.end()), pair.second.end());
    }

    LOG_DEBUG("Parsed query for columns: {}", JsonUtils::toJson(result).dump());
    return result;
}

bool QueryAnalyzerService::hasExistingIndex(const std::string& table_name, const std::string& column_name) {
    // This function would typically query the PostgreSQL catalog (pg_indexes, pg_stat_user_tables etc.)
    // to check for existing indexes on the given table.column.
    // For this demonstration, we'll mock it.
    LOG_DEBUG("Checking for existing index on {}.{}", table_name, column_name);
    // Simulate a check (e.g., if column name is 'indexed_col', assume it has an index)
    if (column_name.find("id") != std::string::npos || column_name.find("primary") != std::string::npos) {
        return true; // Assume primary keys are indexed
    }
    // In a real scenario, you'd execute a query like:
    // SELECT 1 FROM pg_indexes WHERE tablename = :table_name AND indexdef LIKE '%' || :column_name || '%';
    return false;
}
```