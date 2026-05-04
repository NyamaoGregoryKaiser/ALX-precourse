```python
# app/services/metric_service.py
import json
from datetime import datetime, timedelta
from app.models.target_db_model import TargetDatabase
from app.models.performance_metric_model import PerformanceMetric
from app.models.optimization_suggestion_model import OptimizationSuggestion
from app.core.db import db
from app.utils.errors import NotFoundError, BadRequestError
from app.utils.logger import logger
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
import re

class MetricService:
    """
    Service for collecting and managing performance metrics from target databases.
    """

    @staticmethod
    def collect_metrics_from_target_db(target_db_id):
        """
        Connects to a target database, collects simulated metrics (e.g., slow queries),
        and stores them. This is a placeholder for real DB interaction.
        """
        target_db = TargetDatabase.get_by_id(target_db_id)
        if not target_db or not target_db.is_active:
            logger.warning(f"Target DB {target_db_id} not found or inactive for metric collection.")
            return []

        logger.info(f"Attempting to collect metrics for '{target_db.name}' ({target_db.db_type})...")
        collected_metrics = []

        try:
            engine = create_engine(target_db.connection_string)
            with engine.connect() as connection:
                # --- PostgreSQL Specific Metric Collection (Example) ---
                if target_db.db_type.lower() == 'postgresql':
                    # Requires pg_stat_statements extension to be enabled in target DB
                    # CREATE EXTENSION pg_stat_statements; in the target DB
                    try:
                        # Fetch slow queries (simplified: just showing some active queries)
                        # In a real scenario, you'd use pg_stat_statements, analyze EXPLAIN plans etc.
                        result = connection.execute(text("""
                            SELECT
                                pid,
                                application_name,
                                usename,
                                client_addr,
                                query,
                                state,
                                query_start,
                                backend_start,
                                xact_start,
                                age(now(), query_start) AS query_duration
                            FROM pg_stat_activity
                            WHERE state = 'active'
                            AND usename = current_user
                            ORDER BY query_duration DESC
                            LIMIT 10;
                        """)).fetchall()

                        if result:
                            for row in result:
                                metric_data = {
                                    'pid': row.pid,
                                    'application_name': row.application_name,
                                    'usename': row.usename,
                                    'client_addr': str(row.client_addr), # Convert IP address to string
                                    'query': row.query,
                                    'state': row.state,
                                    'query_start': row.query_start.isoformat() if row.query_start else None,
                                    'query_duration_seconds': row.query_duration.total_seconds() if row.query_duration else None
                                }
                                # Only record if it's a "slow" query (e.g., > 1 second for active queries)
                                if metric_data['query_duration_seconds'] and metric_data['query_duration_seconds'] > 1.0:
                                    metric = PerformanceMetric(
                                        target_db_id=target_db.id,
                                        metric_type='slow_query_active',
                                        metric_value=json.dumps(metric_data),
                                        timestamp=datetime.utcnow(),
                                        is_anomaly=True if metric_data['query_duration_seconds'] > 5.0 else False
                                    )
                                    db.session.add(metric)
                                    collected_metrics.append(metric)
                                    logger.info(f"Collected slow_query_active metric for DB {target_db.name}")

                        # Simulate collecting index usage stats (requires pg_stat_user_indexes)
                        index_stats = connection.execute(text("""
                            SELECT
                                relname AS table_name,
                                indexrelname AS index_name,
                                idx_scan,
                                idx_tup_read,
                                idx_tup_fetch
                            FROM pg_stat_user_indexes
                            ORDER BY idx_scan DESC
                            LIMIT 10;
                        """)).fetchall()
                        if index_stats:
                            metric_data = [{'table_name': r.table_name, 'index_name': r.index_name, 'idx_scan': r.idx_scan, 'idx_tup_read': r.idx_tup_read, 'idx_tup_fetch': r.idx_tup_fetch} for r in index_stats]
                            metric = PerformanceMetric(
                                target_db_id=target_db.id,
                                metric_type='index_usage_stats',
                                metric_value=json.dumps(metric_data),
                                timestamp=datetime.utcnow()
                            )
                            db.session.add(metric)
                            collected_metrics.append(metric)
                            logger.info(f"Collected index_usage_stats metric for DB {target_db.name}")

                    except ProgrammingError as e:
                        logger.warning(f"Could not collect PostgreSQL specific metrics for '{target_db.name}'. "
                                       f"Ensure required extensions (e.g., pg_stat_statements) are enabled or permissions are correct. Error: {e}")
                    except Exception as e:
                        logger.error(f"Error collecting PostgreSQL metrics for '{target_db.name}': {e}")
                        
                # --- General Metric (Example: Table Row Counts) ---
                try:
                    table_counts = connection.execute(text("""
                        SELECT relname AS table_name, reltuples AS row_count
                        FROM pg_class
                        WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                        ORDER BY reltuples DESC
                        LIMIT 10;
                    """)).fetchall()
                    if table_counts:
                        metric_data = [{'table_name': r.table_name, 'row_count': int(r.row_count)} for r in table_counts]
                        metric = PerformanceMetric(
                            target_db_id=target_db.id,
                            metric_type='table_row_counts',
                            metric_value=json.dumps(metric_data),
                            timestamp=datetime.utcnow()
                        )
                        db.session.add(metric)
                        collected_metrics.append(metric)
                        logger.info(f"Collected table_row_counts metric for DB {target_db.name}")
                except Exception as e:
                    logger.error(f"Error collecting general table metrics for '{target_db.name}': {e}")

                db.session.commit()
                logger.info(f"Finished collecting metrics for '{target_db.name}'. Collected {len(collected_metrics)} metrics.")
                return collected_metrics

        except OperationalError as e:
            logger.error(f"Failed to connect to target database '{target_db.name}': {e}")
            db.session.rollback()
            raise BadRequestError(f"Failed to connect to target database: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during metric collection for '{target_db.name}': {e}")
            db.session.rollback()
            raise

    @staticmethod
    def get_metrics_for_db(target_db_id, metric_type=None, start_date=None, end_date=None):
        """
        Retrieves performance metrics for a specific target database.
        """
        query = PerformanceMetric.query.filter_by(target_db_id=target_db_id)
        if metric_type:
            query = query.filter_by(metric_type=metric_type)
        if start_date:
            query = query.filter(PerformanceMetric.timestamp >= start_date)
        if end_date:
            query = query.filter(PerformanceMetric.timestamp <= end_date)
        return query.order_by(PerformanceMetric.timestamp.desc()).all()

    @staticmethod
    def get_metric_by_id(metric_id):
        """Retrieves a single metric by its ID."""
        metric = PerformanceMetric.get_by_id(metric_id)
        if not metric:
            raise NotFoundError(f"Performance metric with id {metric_id} not found.")
        return metric

    @staticmethod
    def update_metric(metric_id, data):
        """Updates a metric's status (e.g., mark as analyzed)."""
        metric = MetricService.get_metric_by_id(metric_id)
        if 'is_anomaly' in data:
            metric.is_anomaly = data['is_anomaly']
        if 'analyzed' in data:
            metric.analyzed = data['analyzed']
        if 'metric_value' in data:
            metric.metric_value = json.dumps(data['metric_value']) if isinstance(data['metric_value'], (dict, list)) else str(data['metric_value'])
        
        metric.save()
        logger.info(f"Metric {metric_id} updated.")
        return metric

    @staticmethod
    def delete_metric(metric_id):
        """Deletes a performance metric."""
        metric = MetricService.get_metric_by_id(metric_id)
        metric.delete()
        logger.info(f"Metric {metric_id} deleted.")
        return True
    
    @staticmethod
    def _parse_sql_query_for_tables_columns(sql_query):
        """
        A very basic SQL parser to extract table names and columns from simple SELECT statements.
        This is a rudimentary implementation for demonstration and would require a full SQL parser
        for a production-grade system.
        """
        tables = set()
        columns = set()

        # Regex to find table names after FROM/JOIN
        table_pattern = re.compile(r'(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+AS\s+[a-zA-Z_][a-zA-Z0-9_]*)?', re.IGNORECASE)
        # Regex to find columns in SELECT or WHERE clauses
        column_pattern = re.compile(r'(?:SELECT|WHERE)\s+.*?(?:[\s,(])([a-zA-Z_][a-zA-Z0-9_]*)(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?[\s,)]?', re.IGNORECASE)
        
        # This is extremely simplistic and prone to errors.
        # A full parser would handle comments, complex expressions, subqueries, etc.
        
        for match in table_pattern.finditer(sql_query):
            tables.add(match.group(1).strip())
        
        # Simplified column extraction
        if "SELECT" in sql_query.upper():
            select_part = sql_query.upper().split("FROM")[0].replace("SELECT", "").strip()
            if select_part != '*':
                for col in select_part.split(','):
                    col = col.strip()
                    if ' AS ' in col.upper():
                        col = col.upper().split(' AS ')[0].strip()
                    if '.' in col: # Handle table.column
                        col = col.split('.')[-1].strip()
                    if col and col != '*':
                        columns.add(col)

        if "WHERE" in sql_query.upper():
            where_part = sql_query.upper().split("WHERE")[1].split("GROUP BY")[0].split("ORDER BY")[0].strip()
            # Extract identifiers that look like column names, not literals or functions
            for potential_col in re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b', where_part):
                 # Simple heuristic: ignore keywords, numbers, true/false, null, common functions
                if potential_col.upper() not in ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DATE', 'CAST', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'] and not potential_col.isdigit():
                    columns.add(potential_col)


        return list(tables), list(columns)

    @staticmethod
    def analyze_slow_query_for_suggestions(metric: PerformanceMetric):
        """
        Analyzes a slow query metric to generate optimization suggestions.
        This is a highly simplified rule-based engine.
        """
        if metric.metric_type != 'slow_query_active':
            return []

        suggestions = []
        try:
            metric_data = json.loads(metric.metric_value)
            query = metric_data.get('query')
            query_duration = metric_data.get('query_duration_seconds')

            if not query or not query_duration:
                return []

            logger.info(f"Analyzing slow query (duration {query_duration}s): {query[:100]}...")

            tables, columns = MetricService._parse_sql_query_for_tables_columns(query)
            
            # Rule 1: Suggest indexing for columns in WHERE clause on slow queries
            if query_duration > 2.0 and "WHERE" in query.upper() and columns:
                for col in columns:
                    for table in tables: # Crude association, would need real parsing
                        if re.search(r'\b' + re.escape(table) + r'\b', query, re.IGNORECASE): # If table appears in query
                            suggestion_desc = f"Consider creating an index on column '{col}' in table '{table}' due to repeated slow queries involving WHERE clauses on this column."
                            sql_stmt = f"CREATE INDEX idx_{table}_{col} ON {table} ({col});"
                            suggestions.append(OptimizationSuggestion(
                                target_db_id=metric.target_db_id,
                                metric_id=metric.id,
                                suggestion_type='index_creation',
                                description=suggestion_desc,
                                sql_statement=sql_stmt,
                                priority='high' if query_duration > 5.0 else 'medium'
                            ))
                            logger.info(f"Generated index suggestion for {table}.{col}.")
                            break # Assume one index per column per query for simplicity

            # Rule 2: Suggest reviewing SELECT *
            if "SELECT *" in query.upper() and query_duration > 3.0:
                suggestions.append(OptimizationSuggestion(
                    target_db_id=metric.target_db_id,
                    metric_id=metric.id,
                    suggestion_type='query_rewrite',
                    description='Avoid using SELECT * in production queries. Specify only the columns you need to reduce I/O and network overhead.',
                    sql_statement=None, # No direct SQL, but a conceptual rewrite
                    priority='medium'
                ))
                logger.info("Generated SELECT * rewrite suggestion.")

            # Rule 3: Suggest reviewing JOIN conditions if multiple tables are involved and slow
            if query_duration > 5.0 and len(tables) > 1 and "JOIN" in query.upper():
                suggestions.append(OptimizationSuggestion(
                    target_db_id=metric.target_db_id,
                    metric_id=metric.id,
                    suggestion_type='query_rewrite',
                    description='Review JOIN conditions for efficiency and consider indexing columns used in JOINs. Ensure proper JOIN types are used.',
                    sql_statement=None,
                    priority='high'
                ))
                logger.info("Generated JOIN review suggestion.")

            if suggestions:
                db.session.add_all(suggestions)
                metric.analyzed = True # Mark the metric as analyzed
                metric.save()
                db.session.commit()
                logger.info(f"Saved {len(suggestions)} suggestions for metric {metric.id}.")
            
            return suggestions

        except json.JSONDecodeError:
            logger.error(f"Failed to parse metric_value for metric {metric.id}: Invalid JSON.")
        except Exception as e:
            logger.exception(f"Error analyzing slow query for metric {metric.id}.")
        return []
```