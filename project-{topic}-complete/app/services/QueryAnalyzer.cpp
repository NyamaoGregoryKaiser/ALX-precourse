```cpp
#include "QueryAnalyzer.hpp"
#include "Poco/RegularExpression.h"
#include "Poco/String.h"
#include "Poco/JSON/Parser.h"
#include "utils/Logger.hpp"
#include <algorithm>

QueryAnalyzer::QueryAnalyzer() {
    DB_OPTIMIZER_LOG_DEBUG("QueryAnalyzer initialized.");
}

std::vector<std::string> QueryAnalyzer::findPattern(const std::string& text, const std::string& regexPattern, int groupIndex) {
    std::vector<std::string> matches;
    Poco::RegularExpression re(regexPattern, Poco::RegularExpression::RE_CASELESS);
    Poco::RegularExpression::MatchVec mvec;
    std::string::const_iterator it = text.begin();
    std::string::const_iterator end = text.end();

    while (re.match(text, mvec, it)) {
        if (mvec.size() > groupIndex) {
            matches.push_back(text.substr(mvec[groupIndex].offset, mvec[groupIndex].length));
        }
        it += mvec[0].length; // Continue search after the current match
    }
    return matches;
}

Poco::JSON::Object::Ptr QueryAnalyzer::analyzeQuery(const std::string& query) {
    Poco::JSON::Object::Ptr analysis = new Poco::JSON::Object();
    std::string lowerQuery = Poco::toLower(query);

    analysis->set("original_query", query);

    // Extract tables
    std::set<std::string> tables = extractTables(lowerQuery);
    Poco::JSON::Array::Ptr tablesArray = new Poco::JSON::Array();
    for (const auto& t : tables) {
        tablesArray->add(t);
    }
    analysis->set("tables", tablesArray);

    // Extract columns for filters/sorts/groups
    std::set<std::string> columns = extractFilterSortGroupColumns(lowerQuery);
    Poco::JSON::Array::Ptr columnsArray = new Poco::JSON::Array();
    for (const auto& c : columns) {
        columnsArray->add(c);
    }
    analysis->set("filter_sort_group_columns", columnsArray);

    // Extract join conditions
    std::vector<std::string> joins = extractJoinConditions(lowerQuery);
    Poco::JSON::Array::Ptr joinsArray = new Poco::JSON::Array();
    for (const auto& j : joins) {
        joinsArray->add(j);
    }
    analysis->set("join_conditions", joinsArray);
    
    DB_OPTIMIZER_LOG_DEBUG("Query analysis complete for: {}", query.substr(0, std::min(query.length(), (size_t)100)));
    return analysis;
}

std::set<std::string> QueryAnalyzer::extractTables(const std::string& query) {
    std::set<std::string> tables;
    
    // FROM clause: FROM (table_name|schema.table_name)
    std::vector<std::string> fromTables = findPattern(query, "from\\s+([a-zA-Z0-9_\\.\"`,\\s]+?)(?:\\s+(?:as)?\\s+[a-zA-Z0-9_\"`]+)?(?:\\s*(?:join|where|group|order|limit|;|$))", 1);
    for (const auto& match : fromTables) {
        // Handle comma-separated tables in FROM clause, e.g., FROM table1, table2
        Poco::RegularExpression comma_re("[^,\\s]+");
        Poco::RegularExpression::MatchVec mvec;
        std::string::const_iterator it = match.begin();
        std::string::const_iterator end = match.end();
        while (comma_re.match(match, mvec, it)) {
            std::string tableName = match.substr(mvec[0].offset, mvec[0].length);
            tables.insert(Poco::trim(tableName));
            it += mvec[0].length;
        }
    }

    // JOIN clause: JOIN (table_name|schema.table_name)
    std::vector<std::string> joinTables = findPattern(query, "(?:inner|left|right|full)?\\s*join\\s+([a-zA-Z0-9_\\.\"`,\\s]+?)(?:\\s+(?:as)?\\s+[a-zA-Z0-9_\"`]+)?(?:\\s+on|\\s+using|\\s*(?:where|group|order|limit|;|$))", 1);
    for (const auto& match : joinTables) {
         Poco::RegularExpression comma_re("[^,\\s]+");
        Poco::RegularExpression::MatchVec mvec;
        std::string::const_iterator it = match.begin();
        std::string::const_iterator end = match.end();
        while (comma_re.match(match, mvec, it)) {
            std::string tableName = match.substr(mvec[0].offset, mvec[0].length);
            tables.insert(Poco::trim(tableName));
            it += mvec[0].length;
        }
    }

    // Clean up potential aliases or schema prefixes for simple table names
    std::set<std::string> cleanedTables;
    for (const std::string& table : tables) {
        std::string cleaned = Poco::trim(table);
        size_t space_pos = cleaned.find(' ');
        if (space_pos != std::string::npos) {
            cleaned = cleaned.substr(0, space_pos);
        }
        size_t dot_pos = cleaned.find('.');
        if (dot_pos != std::string::npos) { // handle schema.table
            cleaned = cleaned.substr(dot_pos + 1);
        }
        Poco::trimInPlace(cleaned);
        // Remove quotes if any (e.g., "my_table")
        if (cleaned.length() > 1 && cleaned.front() == '"' && cleaned.back() == '"') {
            cleaned = cleaned.substr(1, cleaned.length() - 2);
        }
        if (!cleaned.empty()) {
            cleanedTables.insert(cleaned);
        }
    }

    return cleanedTables;
}

std::set<std::string> QueryAnalyzer::extractFilterSortGroupColumns(const std::string& query) {
    std::set<std::string> columns;

    // WHERE clause (simple approximation: words followed by comparison operators)
    // Matches: (word) (=|<>|!=|<|>|<=|>=|LIKE|ILIKE|IN|BETWEEN) (value)
    // Or: (word) (IS NULL|IS NOT NULL)
    // Or: function((word))
    // This is very rudimentary. A real parser would build an AST.
    std::vector<std::string> where_conditions = findPattern(query, "where\\s+(.*?)(?:group by|order by|limit|;|$)", 1);
    for (const auto& cond_block : where_conditions) {
        Poco::RegularExpression re("([a-zA-Z0-9_\"`\\.]+)\\s*(?:=|<>|!=|<|>|<=|>=|like|ilike|in|between|is null|is not null)", Poco::RegularExpression::RE_CASELESS);
        Poco::RegularExpression::MatchVec mvec;
        std::string::const_iterator it = cond_block.begin();
        std::string::const_iterator end = cond_block.end();

        while (re.match(cond_block, mvec, it)) {
            std::string column = cond_block.substr(mvec[1].offset, mvec[1].length);
            columns.insert(Poco::trim(column));
            it += mvec[0].length; // Continue search after the current match
        }
    }

    // ORDER BY clause
    std::vector<std::string> order_by_clauses = findPattern(query, "order by\\s+([a-zA-Z0-9_\"`\\.,\\s]+?)(?:asc|desc)?(?:limit|;|$)", 1);
    for (const auto& clause : order_by_clauses) {
        // Split by comma
        std::vector<std::string> parts;
        Poco::trim(clause).split(parts, ",");
        for (std::string& part : parts) {
            Poco::trimInPlace(part);
            size_t space_pos = part.find(' '); // Remove ASC/DESC
            if (space_pos != std::string::npos) {
                part = part.substr(0, space_pos);
            }
            if (!part.empty()) columns.insert(part);
        }
    }

    // GROUP BY clause
    std::vector<std::string> group_by_clauses = findPattern(query, "group by\\s+([a-zA-Z0-9_\"`\\.,\\s]+?)(?:having|order by|limit|;|$)", 1);
    for (const auto& clause : group_by_clauses) {
        std::vector<std::string> parts;
        Poco::trim(clause).split(parts, ",");
        for (std::string& part : parts) {
            Poco::trimInPlace(part);
            if (!part.empty()) columns.insert(part);
        }
    }
    
    // Clean up potential table prefixes (e.g., t.column -> column)
    std::set<std::string> cleanedColumns;
    for (const std::string& col : columns) {
        std::string cleaned = Poco::trim(col);
        size_t dot_pos = cleaned.find('.');
        if (dot_pos != std::string::npos) {
            cleaned = cleaned.substr(dot_pos + 1);
        }
        // Remove quotes if any (e.g., "my_column")
        if (cleaned.length() > 1 && cleaned.front() == '"' && cleaned.back() == '"') {
            cleaned = cleaned.substr(1, cleaned.length() - 2);
        }
        if (!cleaned.empty()) {
            cleanedColumns.insert(cleaned);
        }
    }

    return cleanedColumns;
}

std::vector<std::string> QueryAnalyzer::extractJoinConditions(const std::string& query) {
    // Matches patterns like "ON a.col = b.col"
    return findPattern(query, "on\\s+([a-zA-Z0-9_\"`\\.\\s=]+?)(?:\\s+and|\\s+(?:inner|left|right|full)?\\s*join|\\s*(?:where|group|order|limit|;|$))", 1);
}
```