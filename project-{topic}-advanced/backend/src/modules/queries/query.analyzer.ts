```typescript
import { AppDataSource } from '../../config/database';
import { SlowQuery } from '../../entities/SlowQuery';
import { QueryPlan, QueryPlanFormat } from '../../entities/QueryPlan';
import { QuerySuggestion, SuggestionType, SuggestionStatus } from '../../entities/QuerySuggestion';
import logger from '../../services/logger.service';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

/**
 * Simulates fetching an EXPLAIN plan for a given SQL query.
 * In a real-world scenario, this would:
 * 1. Connect to the actual database specified by slowQuery.database.connectionString.
 * 2. Run `EXPLAIN (FORMAT JSON, ANALYZE)` (or equivalent for other DBs) on the query.
 * 3. Parse the JSON output.
 * For this exercise, we'll return a mock plan, but the structure demonstrates intent.
 *
 * @param sqlQuery The SQL query string.
 * @param dbType The type of database (e.g., 'postgresql').
 * @returns {Promise<{ planData: object; totalCost?: number; actualRows?: number; }>} Simulated plan data.
 */
async function getSimulatedExplainPlan(sqlQuery: string, dbType: string): Promise<{ planData: object; totalCost?: number; actualRows?: number; }> {
  logger.debug(`Simulating EXPLAIN for query: ${sqlQuery.substring(0, 100)}...`);

  // Simple mock plan data based on common scenarios
  const mockPlan = {
    "Plan": {
      "Node Type": "Seq Scan",
      "Relation Name": "large_table",
      "Alias": "lt",
      "Startup Cost": 0.00,
      "Total Cost": 1000000.00,
      "Plan Rows": 5000000,
      "Plan Width": 100,
      "Actual Startup Time": 1500.00,
      "Actual Total Time": 8000.00,
      "Actual Rows": 5000000,
      "Actual Loops": 1,
      "Filter": "(some_column > 100)",
      "Rows Removed by Filter": 0,
      "Output": ["lt.id", "lt.data"]
    }
  };

  let totalCost = 1000000;
  let actualRows = 5000000;

  // Basic "smart" mock based on query keywords
  if (sqlQuery.toLowerCase().includes('join') && sqlQuery.toLowerCase().includes('where')) {
    mockPlan["Plan"]["Node Type"] = "Hash Join";
    mockPlan["Plan"]["Plans"] = [
      { "Node Type": "Seq Scan", "Relation Name": "tableA" },
      { "Node Type": "Hash", "Plans": [{ "Node Type": "Seq Scan", "Relation Name": "tableB" }] }
    ];
    totalCost = 500000;
    actualRows = 100000;
  } else if (sqlQuery.toLowerCase().includes('order by')) {
    mockPlan["Plan"]["Node Type"] = "Sort";
    mockPlan["Plan"]["Sort Key"] = ["some_column"];
    totalCost *= 1.2; // Sorting adds cost
  }

  // Example: If an index suggestion was previously made, simulate a better plan
  if (sqlQuery.includes("orders.order_date") && sqlQuery.includes("customers.region")) {
    mockPlan["Plan"]["Node Type"] = "Nested Loop"; // Often preferred with good indexes
    mockPlan["Plan"]["Total Cost"] = 50000; // Much lower with indexes
    mockPlan["Plan"]["Actual Total Time"] = 500;
  }

  return {
    planData: mockPlan,
    totalCost: totalCost,
    actualRows: actualRows,
  };
}

/**
 * Analyzes a SQL query string to identify common anti-patterns and suggest optimizations.
 * This is a simplified, pattern-based analysis. A real analyzer would use a full SQL parser (e.g., pg_query_parser, sqlglot).
 *
 * @param sqlQuery The SQL query string.
 * @param dbType The type of database.
 * @returns {Array<Pick<QuerySuggestion, 'type' | 'description' | 'sqlStatement'>>} An array of suggested optimizations.
 */
function analyzeQueryForSuggestions(sqlQuery: string, dbType: string): Array<Pick<QuerySuggestion, 'type' | 'description' | 'sqlStatement'>> {
  const suggestions: Array<Pick<QuerySuggestion, 'type' | 'description' | 'sqlStatement'>> = [];
  const lowerCaseQuery = sqlQuery.toLowerCase();

  // Rule 1: SELECT *
  if (lowerCaseQuery.includes('select * from')) {
    suggestions.push({
      type: SuggestionType.QUERY_REWRITE,
      description: 'Avoid `SELECT *`. Explicitly list columns needed to reduce data transfer and memory usage.',
      sqlStatement: `Consider: SELECT column1, column2, ... FROM table;`,
    });
  }

  // Rule 2: Missing WHERE clause on large tables
  const fromMatches = [...sqlQuery.matchAll(/from\s+([a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)/g)];
  if (!lowerCaseQuery.includes('where')) {
    for (const match of fromMatches) {
      const tableName = match[2];
      // Heuristically assume tables might be large for suggestion
      suggestions.push({
        type: SuggestionType.QUERY_REWRITE,
        description: `Consider adding a WHERE clause to filter data from '${tableName}' if you do not intend to retrieve all rows.`,
        sqlStatement: `Example: SELECT ... FROM ${tableName} WHERE some_column = 'value';`,
      });
    }
  }

  // Rule 3: ORDER BY without LIMIT
  if (lowerCaseQuery.includes('order by') && !lowerCaseQuery.includes('limit')) {
    suggestions.push({
      type: SuggestionType.QUERY_REWRITE,
      description: 'If you only need a subset of sorted data, add a `LIMIT` clause to improve performance.',
      sqlStatement: `Consider: SELECT ... ORDER BY column LIMIT 100;`,
    });
  }

  // Rule 4: Functions in WHERE clause (prevents index usage)
  const functionInWhereMatch = lowerCaseQuery.match(/where\s+.*(lower|upper|date_trunc|to_char|extract)\s*\(/);
  if (functionInWhereMatch) {
    suggestions.push({
      type: SuggestionType.INDEX,
      description: `Avoid using functions on indexed columns in WHERE clauses (e.g., \`${functionInWhereMatch[1]}\`). This can prevent index usage. Consider functional indexes or rewriting the condition.`,
      sqlStatement: `Example: Instead of WHERE date_trunc('day', created_at) = '2024-01-01', try WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02'.`,
    });
  }

  // Rule 5: LIKE with leading wildcard (e.g., LIKE '%value')
  if (lowerCaseQuery.match(/like\s+'%[^%]+'/)) {
    suggestions.push({
      type: SuggestionType.INDEX,
      description: `Avoid leading wildcards in LIKE clauses (e.g., \`%value\`). This prevents efficient use of standard B-tree indexes. Consider trigram indexes (GIN/GIST in PostgreSQL) or full-text search.`,
      sqlStatement: `Example (PostgreSQL): CREATE EXTENSION pg_trgm; CREATE INDEX trgm_idx_column ON table USING gin (column gin_trgm_ops);`,
    });
  }

  // Rule 6: Missing index on JOIN conditions
  // This is very difficult to detect reliably without schema knowledge or an actual EXPLAIN plan.
  // We'll make a heuristic assumption: if there are joins, suggest indexing join columns.
  const joinMatches = [...sqlQuery.matchAll(/(join\s+\S+\s+on\s+)(.+?)\s*=\s*(.+?)(\s+|$)/g)];
  for (const match of joinMatches) {
    const tableAColumn = match[2].trim().split('.').pop(); // e.g., orders.customer_id -> customer_id
    const tableBColumn = match[3].trim().split('.').pop();
    if (tableAColumn && tableBColumn) {
      suggestions.push({
        type: SuggestionType.INDEX,
        description: `Consider creating indexes on columns used in JOIN conditions, such as \`${tableAColumn}\` and \`${tableBColumn}\`, for faster joins.`,
        sqlStatement: `Example: CREATE INDEX idx_tableA_${tableAColumn} ON tableA (${tableAColumn});`,
      });
    }
  }

  // Rule 7: Subqueries that can be rewritten as joins
  if (lowerCaseQuery.includes('in (select') || lowerCaseQuery.includes('not in (select')) {
    suggestions.push({
      type: SuggestionType.QUERY_REWRITE,
      description: 'Consider rewriting `IN` / `NOT IN` subqueries as `JOIN`s or `EXISTS` clauses for better performance, especially with large subquery results.',
      sqlStatement: `Example: SELECT t1.* FROM table1 t1 JOIN table2 t2 ON t1.id = t2.id;`,
    });
  }
  
  // Rule 8: Too many aggregations / group by
  if (lowerCaseQuery.includes('group by') && lowerCaseQuery.match(/count\(distinct/g) && lowerCaseQuery.match(/group by/g) && sqlQuery.length > 500) {
    suggestions.push({
      type: SuggestionType.OTHER,
      description: 'Complex aggregations with `DISTINCT` and `GROUP BY` on large datasets can be slow. Consider materialized views or pre-aggregation.',
      sqlStatement: null,
    });
  }


  // Add more rules as needed...
  return suggestions;
}

/**
 * Orchestrates the analysis of a slow query: fetches an explain plan and generates suggestions.
 * Persists the results to the database.
 * @param slowQuery The SlowQuery entity to analyze.
 */
export async function analyzeAndSuggestOptimizations(slowQuery: SlowQuery): Promise<void> {
  const queryPlanRepository = AppDataSource.getRepository(QueryPlan);
  const querySuggestionRepository = AppDataSource.getRepository(QuerySuggestion);

  logger.info(`Starting analysis for slow query ID: ${slowQuery.id}`);

  try {
    // 1. Get/Simulate Query Plan
    const { planData, totalCost, actualRows } = await getSimulatedExplainPlan(slowQuery.query, slowQuery.database.type);

    const queryPlan = new QueryPlan();
    queryPlan.slowQuery = slowQuery;
    queryPlan.slowQueryId = slowQuery.id;
    queryPlan.planData = planData;
    queryPlan.format = QueryPlanFormat.JSON; // Assuming JSON output
    queryPlan.totalCost = totalCost;
    queryPlan.actualRows = actualRows;
    await queryPlanRepository.save(queryPlan);
    logger.info(`Saved simulated query plan for slow query ID: ${slowQuery.id}`);

    // 2. Analyze query for suggestions
    const rawSuggestions = analyzeQueryForSuggestions(slowQuery.query, slowQuery.database.type);

    for (const rawSuggestion of rawSuggestions) {
      const suggestion = new QuerySuggestion();
      suggestion.slowQuery = slowQuery;
      suggestion.slowQueryId = slowQuery.id;
      suggestion.type = rawSuggestion.type;
      suggestion.description = rawSuggestion.description;
      suggestion.sqlStatement = rawSuggestion.sqlStatement;
      suggestion.status = SuggestionStatus.PENDING;
      await querySuggestionRepository.save(suggestion);
    }
    logger.info(`Generated ${rawSuggestions.length} suggestions for slow query ID: ${slowQuery.id}`);

  } catch (error) {
    logger.error(`Error during analysis for slow query ID ${slowQuery.id}:`, error);
    // Depending on error, might store a 'failed analysis' status or notify.
  }
}
```

#### `backend/src/app.ts`