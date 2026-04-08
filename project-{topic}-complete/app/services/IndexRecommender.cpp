```cpp
#include "IndexRecommender.hpp"
#include "Poco/RegularExpression.h"
#include "Poco/String.h"
#include "Poco/Data/Statement.h"
#include "db/PostgreSQLAdapter.hpp" // For PostgreSQLAdapter
#include "utils/Logger.hpp"

IndexRecommender::IndexRecommender(PostgreSQLAdapter* dbAdapter) : _dbAdapter(dbAdapter) {
    DB_OPTIMIZER_LOG_DEBUG("IndexRecommender initialized.");
}

std::vector<IndexRecommendation> IndexRecommender::recommendIndexes(
    const Poco::JSON::Object::Ptr& analyzedQuery,
    const std::string& explainAnalyzeOutput,
    int monitoredDbId
) {
    std::vector<IndexRecommendation> recommendations;
    std::string originalQuery = analyzedQuery->getValue<std::string>("original_query");
    Poco::JSON::Array::Ptr tablesArray = analyzedQuery->getArray("tables");
    Poco::JSON::Array::Ptr filterSortGroupColumnsArray = analyzedQuery->getArray("filter_sort_group_columns");
    Poco::JSON::Array::Ptr joinConditionsArray = analyzedQuery->getArray("join_conditions");

    // Convert JSON arrays to std::sets for easier lookup
    std::set<std::string> tables;
    if (tablesArray) {
        for (size_t i = 0; i < tablesArray->size(); ++i) {
            tables.insert(tablesArray->get(i).convert<std::string>());
        }
    }

    std::set<std::string> filterSortGroupColumns;
    if (filterSortGroupColumnsArray) {
        for (size_t i = 0; i < filterSortGroupColumnsArray->size(); ++i) {
            filterSortGroupColumns.insert(filterSortGroupColumnsArray->get(i).convert<std::string>());
        }
    }

    // 1. Recommend indexes for WHERE, ORDER BY, GROUP BY clauses
    for (const std::string& table : tables) {
        std::set<std::string> existingIndexes = getExistingIndexes(monitoredDbId, table);
        std::vector<std::string> candidateColumns;

        // Collect columns used in WHERE/ORDER BY/GROUP BY for this table
        for (const std::string& col : filterSortGroupColumns) {
            // A naive check: assume column without table prefix belongs to any table.
            // A more robust system would map columns to tables based on schema.
            // For now, if a column exists, we consider it for indexing on *all* tables it might apply to.
            candidateColumns.push_back(col);
        }
        
        // Add columns from JOIN conditions
        if (joinConditionsArray) {
            for(size_t i = 0; i < joinConditionsArray->size(); ++i) {
                std::string join_cond = joinConditionsArray->get(i).convert<std::string>();
                Poco::RegularExpression re("([a-zA-Z0-9_\"`\\.]+)\\s*=\\s*([a-zA-Z0-9_\"`\\.]+)");
                Poco::RegularExpression::MatchVec mvec;
                if (re.match(join_cond, mvec)) {
                    std::string col1 = join_cond.substr(mvec[1].offset, mvec[1].length);
                    std::string col2 = join_cond.substr(mvec[2].offset, mvec[2].length);
                    
                    // Simple check: if a column has the table name as prefix
                    if (Poco::toLower(col1).find(Poco::toLower(table) + ".") == 0 ||
                        Poco::toLower(col1).find("." + Poco::toLower(table) + ".") != std::string::npos) { // For alias.column
                        candidateColumns.push_back(col1);
                    }
                    if (Poco::toLower(col2).find(Poco::toLower(table) + ".") == 0 ||
                        Poco::toLower(col2).find("." + Poco::toLower(table) + ".") != std::string::npos) {
                        candidateColumns.push_back(col2);
                    }
                }
            }
        }

        // De-duplicate and sort candidate columns to ensure consistent index names
        std::sort(candidateColumns.begin(), candidateColumns.end());
        candidateColumns.erase(std::unique(candidateColumns.begin(), candidateColumns.end()), candidateColumns.end());

        if (!candidateColumns.empty()) {
            std::string combinedColumns = Poco::cat(candidateColumns, ",");
            // Remove table prefixes like "table_name.column_name" to just "column_name" for index creation
            Poco::RegularExpression prefix_re("^[a-zA-Z0-9_\"`\\.]+\\.([a-zA-Z0-9_\"`]+)$");
            Poco::RegularExpression::MatchVec mvec;
            std::vector<std::string> finalIndexColumns;
            for(const auto& col_with_prefix : candidateColumns) {
                std::string cleaned_col = col_with_prefix;
                if (prefix_re.match(col_with_prefix, mvec) && mvec.size() > 1) {
                    cleaned_col = col_with_prefix.substr(mvec[1].offset, mvec[1].length);
                }
                finalIndexColumns.push_back(cleaned_col);
            }
            std::string finalCombinedColumns = Poco::cat(finalIndexColumns, ",");


            if (!isIndexRedundant(table, finalCombinedColumns, existingIndexes)) {
                recommendations.push_back({
                    "B-TREE",
                    table,
                    finalCombinedColumns,
                    "Index recommended for columns used in WHERE/ORDER BY/GROUP BY clauses and/or JOIN conditions.",
                    generateCreateIndexDDL(table, finalCombinedColumns, "auto")
                });
            }
        }
    }

    // 2. Recommend indexes for sequential scans found in EXPLAIN ANALYZE
    std::vector<std::string> seqScans = parseExplainAnalyzeForSequentialScans(explainAnalyzeOutput);
    for (const std::string& seqScanTable : seqScans) {
        // This is tricky. A sequential scan on its own doesn't tell us *what column* to index.
        // It indicates the whole table is being scanned. We need to pair it with query predicates.
        // For simplicity, we'll try to find columns from the analyzed query that are related to this table.
        
        std::set<std::string> existingIndexes = getExistingIndexes(monitoredDbId, seqScanTable);
        std::vector<std::string> candidateColumnsForScan;

        // Look for filter/sort/group columns that might belong to this table
        for (const std::string& col : filterSortGroupColumns) {
            // Again, a naive check. A real system would resolve columns to tables.
            candidateColumnsForScan.push_back(col);
        }
        
        // De-duplicate and sort
        std::sort(candidateColumnsForScan.begin(), candidateColumnsForScan.end());
        candidateColumnsForScan.erase(std::unique(candidateColumnsForScan.begin(), candidateColumnsForScan.end()), candidateColumnsForScan.end());

        if (!candidateColumnsForScan.empty()) {
             // Remove table prefixes
            Poco::RegularExpression prefix_re("^[a-zA-Z0-9_\"`\\.]+\\.([a-zA-Z0-9_\"`]+)$");
            Poco::RegularExpression::MatchVec mvec;
            std::vector<std::string> finalIndexColumns;
            for(const auto& col_with_prefix : candidateColumnsForScan) {
                std::string cleaned_col = col_with_prefix;
                if (prefix_re.match(col_with_prefix, mvec) && mvec.size() > 1) {
                    cleaned_col = col_with_prefix.substr(mvec[1].offset, mvec[1].length);
                }
                finalIndexColumns.push_back(cleaned_col);
            }
            std::string finalCombinedColumns = Poco::cat(finalIndexColumns, ",");

            if (!isIndexRedundant(seqScanTable, finalCombinedColumns, existingIndexes)) {
                recommendations.push_back({
                    "B-TREE",
                    seqScanTable,
                    finalCombinedColumns,
                    "Index recommended to avoid sequential scans on table '" + seqScanTable + "' affecting query: " + originalQuery,
                    generateCreateIndexDDL(seqScanTable, finalCombinedColumns, "seqscan_avoidance")
                });
            }
        }
    }
    
    DB_OPTIMIZER_LOG_DEBUG("Index recommendations generated for query: {}", originalQuery.substr(0, std::min(originalQuery.length(), (size_t)100)));
    return recommendations;
}

std::set<std::string> IndexRecommender::getExistingIndexes(int monitoredDbId, const std::string& tableName) {
    std::set<std::string> existingIndexes;
    try {
        Poco::Data::Session targetDbSession = _dbAdapter->getNewSession(monitoredDbId);
        std::string query = "SELECT indexdef FROM pg_indexes WHERE tablename = $1 AND schemaname = 'public';"; // Assuming public schema
        Poco::Data::Statement select(targetDbSession);
        std::string indexDef;
        select << query,
            Poco::Data::Keywords::use(tableName),
            Poco::Data::Keywords::into(indexDef),
            Poco::Data::Keywords::range(0, 1); // Fetch one row at a time

        while (!select.done()) {
            select.execute();
            if (!indexDef.empty()) {
                // Extract column names from indexDef (e.g., "CREATE INDEX ON my_table (col1, col2)")
                Poco::RegularExpression re("\\(([^)]+)\\)"); // Matches content inside parentheses
                Poco::RegularExpression::MatchVec mvec;
                if (re.match(indexDef, mvec) && mvec.size() > 1) {
                    std::string cols = indexDef.substr(mvec[1].offset, mvec[1].length);
                    std::vector<std::string> raw_cols;
                    Poco::trim(cols).split(raw_cols, ",");
                    std::vector<std::string> cleaned_cols;
                    for (std::string& c : raw_cols) {
                        Poco::trimInPlace(c);
                        // Remove quotes and potential DESC/ASC
                        if (c.length() > 1 && c.front() == '"' && c.back() == '"') {
                            c = c.substr(1, c.length() - 2);
                        }
                        size_t space_pos = c.find(' ');
                        if (space_pos != std::string::npos) {
                            c = c.substr(0, space_pos);
                        }
                        if (!c.empty()) cleaned_cols.push_back(c);
                    }
                    std::sort(cleaned_cols.begin(), cleaned_cols.end()); // Canonical form for comparison
                    existingIndexes.insert(Poco::cat(cleaned_cols, ","));
                }
            }
        }
        return existingIndexes;
    } catch (const Poco::Data::PostgreSQL::ConnectionException& e) {
        DB_OPTIMIZER_LOG_ERROR("Failed to connect to monitored DB (ID {}): {}", monitoredDbId, e.displayText());
    } catch (const Poco::Data::PostgreSQL::StatementException& e) {
        DB_OPTIMIZER_LOG_ERROR("SQL error querying existing indexes for DB ID {} (table {}): {}", monitoredDbId, tableName, e.displayText());
    } catch (const std::exception& e) {
        DB_OPTIMIZER_LOG_ERROR("Error getting existing indexes for DB ID {} (table {}): {}", monitoredDbId, tableName, e.what());
    }
    return existingIndexes;
}

std::vector<std::string> IndexRecommender::parseExplainAnalyzeForSequentialScans(const std::string& explainAnalyzeOutput) {
    std::vector<std::string> tablesWithSeqScan;
    // Regex to find "Seq Scan on <table_name>"
    Poco::RegularExpression re("Seq Scan on \"?([a-zA-Z0-9_]+)\"?", Poco::RegularExpression::RE_CASELESS);
    Poco::RegularExpression::MatchVec mvec;
    std::string::const_iterator it = explainAnalyzeOutput.begin();
    std::string::const_iterator end = explainAnalyzeOutput.end();

    while (re.match(explainAnalyzeOutput, mvec, it)) {
        if (mvec.size() > 1) {
            std::string tableName = explainAnalyzeOutput.substr(mvec[1].offset, mvec[1].length);
            tablesWithSeqScan.push_back(Poco::toLower(tableName)); // Store in lower case for consistency
        }
        it += mvec[0].length; // Continue search after the current match
    }
    return tablesWithSeqScan;
}

std::string IndexRecommender::generateCreateIndexDDL(const std::string& tableName, const std::string& columns, const std::string& indexNameSuffix) {
    std::string cleanTableName = tableName;
    Poco::replaceInPlace(cleanTableName, ".", "_"); // Replace schema.table with schema_table
    Poco::replaceInPlace(cleanTableName, "\"", ""); // Remove quotes
    
    std::string cleanColumns = columns;
    Poco::replaceInPlace(cleanColumns, ".", "_");
    Poco::replaceInPlace(cleanColumns, "\"", "");
    Poco::replaceInPlace(cleanColumns, ",", "_");

    std::string indexName = "idx_" + cleanTableName + "_" + cleanColumns + "_" + indexNameSuffix;
    // Ensure index name isn't too long for PostgreSQL (63 chars default)
    if (indexName.length() > 63) {
        indexName = indexName.substr(0, 58) + "_" + indexNameSuffix; // Truncate and re-add suffix
    }

    return "CREATE INDEX " + indexName + " ON " + tableName + " (" + columns + ");";
}

bool IndexRecommender::isIndexRedundant(const std::string& tableName, const std::string& columns, const std::set<std::string>& existingIndexes) {
    // Canonicalize the columns for comparison (sorted, comma-separated)
    std::vector<std::string> newIndexCols;
    Poco::trim(columns).split(newIndexCols, ",");
    std::sort(newIndexCols.begin(), newIndexCols.end());
    std::string canonicalNewIndex = Poco::cat(newIndexCols, ",");

    for (const std::string& existingIndexCols : existingIndexes) {
        // If an existing index covers the same set of columns, it's redundant.
        // Or if an existing index is a prefix of the new index (e.g., existing on (a), new on (a,b))
        // or the new index is a prefix of an existing index (e.g., existing on (a,b), new on (a)) - might not be redundant, but less effective.
        // For simplicity, we check for exact match or if the existing index *is* the new index (subset).
        if (existingIndexCols == canonicalNewIndex || 
            (existingIndexCols.length() < canonicalNewIndex.length() && 
             Poco::startsWith(canonicalNewIndex, existingIndexCols + ","))) {
            DB_OPTIMIZER_LOG_DEBUG("Index on {} ({}) is redundant with existing index on ({})", tableName, columns, existingIndexCols);
            return true;
        }
    }
    return false;
}
```