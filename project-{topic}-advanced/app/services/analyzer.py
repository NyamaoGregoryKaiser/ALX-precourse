import logging
from datetime import datetime
from typing import Dict, List, Any
from app.database import db
from app.models import MonitoredDatabase, Metric, Report, ReportType, MetricType, OptimizationTask, TaskStatus

logger = logging.getLogger(__name__)

class DatabaseAnalyzer:
    """
    Service for analyzing collected database metrics and generating optimization recommendations.
    """

    def analyze_metrics_and_generate_report(self, db_config: Dict[str, Any], task_id: int) -> Dict[str, Any]:
        """
        Analyzes metrics for a given database and generates an optimization report.

        Args:
            db_config: Dictionary containing monitored database connection details.
            task_id: The ID of the OptimizationTask that triggered this analysis.

        Returns:
            A dictionary containing the generated report data.
        """
        db_id = db_config['id']
        logger.info(f"Starting analysis for database ID: {db_id}, Task ID: {task_id}")

        monitored_db = MonitoredDatabase.query.get(db_id)
        if not monitored_db:
            logger.error(f"Monitored database with ID {db_id} not found during analysis.")
            raise ValueError(f"Monitored database {db_id} not found.")

        # Fetch relevant metrics
        latest_metrics = self._get_latest_metrics(db_id)
        
        # Perform various analyses
        index_recs = self._analyze_indexes(latest_metrics.get(MetricType.INDEX_USAGE), latest_metrics.get(MetricType.MISSING_INDEXES_CANDIDATES))
        slow_query_recs = self._analyze_slow_queries(latest_metrics.get(MetricType.SLOW_QUERIES))
        config_recs = self._analyze_db_config(latest_metrics.get(MetricType.DB_CONFIG_PARAMS))
        overall_summary = self._generate_overall_summary(index_recs, slow_query_recs, config_recs)

        # Combine all recommendations
        all_recommendations = {
            "index_recommendations": index_recs,
            "slow_query_optimization": slow_query_recs,
            "config_tuning": config_recs,
        }

        # Generate and save the report
        report_data = self._create_and_save_report(
            user_id=monitored_db.user_id,
            db_id=db_id,
            task_id=task_id,
            title=f"Optimization Report for {monitored_db.name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            summary=overall_summary,
            recommendations=all_recommendations,
            raw_data=latest_metrics # Store raw metrics used for this report
        )

        logger.info(f"Analysis completed and report generated for database ID: {db_id}, Task ID: {task_id}")
        return report_data

    def _get_latest_metrics(self, db_id: int) -> Dict[MetricType, Any]:
        """Fetches the latest available metrics for all relevant types."""
        metrics_map = {}
        for metric_type in [MetricType.INDEX_USAGE, MetricType.SLOW_QUERIES,
                             MetricType.MISSING_INDEXES_CANDIDATES, MetricType.DB_CONFIG_PARAMS,
                             MetricType.TABLE_STATS, MetricType.ACTIVE_QUERIES]:
            metric = Metric.query.filter_by(db_id=db_id, metric_type=metric_type)\
                                 .order_by(Metric.timestamp.desc()).first()
            if metric:
                metrics_map[metric_type] = metric.data
        return metrics_map

    def _analyze_indexes(self, index_usage_data: List[Dict], missing_indexes_data: List[Dict]) -> List[Dict]:
        """
        Analyzes index usage and suggests new indexes or dropping unused ones.
        """
        recommendations = []

        if missing_indexes_data:
            for rec in missing_indexes_data:
                recommendations.append({
                    "type": "CREATE_INDEX",
                    "severity": "high",
                    "description": f"Consider creating index on table '{rec.get('table_name')}' for columns '{rec.get('columns')}' to optimize query: '{rec.get('query_sample')}'",
                    "sql": rec.get('create_index_sql')
                })
        
        if index_usage_data:
            for index_stat in index_usage_data:
                if index_stat.get('index_scans') == 0 and index_stat.get('index_size_mb', 0) > 1: # Unused index
                    recommendations.append({
                        "type": "DROP_INDEX",
                        "severity": "low",
                        "description": f"Index '{index_stat.get('index_name')}' on table '{index_stat.get('table_name')}' appears unused (0 scans). Consider dropping it if not needed.",
                        "sql": f"DROP INDEX IF EXISTS {index_stat.get('index_name')};" # Placeholder, actual name might need schema prefix
                    })
                # More complex logic for inefficient indexes could go here (e.g., duplicate indexes)

        if not recommendations:
            recommendations.append({"type": "INFO", "description": "No immediate index optimization recommendations based on current metrics."})

        return recommendations

    def _analyze_slow_queries(self, slow_queries_data: List[Dict]) -> List[Dict]:
        """
        Analyzes slow query data and suggests potential improvements.
        """
        recommendations = []

        if slow_queries_data:
            # Sort by total_time for most impactful queries first
            sorted_queries = sorted(slow_queries_data, key=lambda x: x.get('total_time', 0), reverse=True)
            for query_info in sorted_queries[:5]: # Focus on top 5 slowest
                recommendations.append({
                    "type": "OPTIMIZE_QUERY",
                    "severity": "high",
                    "description": f"Slow Query detected (total time: {query_info.get('total_time')}ms, calls: {query_info.get('calls')}). Consider optimizing query: '{query_info.get('query')}'",
                    "details": "Analyze execution plan (EXPLAIN ANALYZE), ensure proper indexing, and review JOIN conditions.",
                    "query_sample": query_info.get('query')
                })
        
        if not recommendations:
            recommendations.append({"type": "INFO", "description": "No significant slow queries detected in recent metrics."})
        
        return recommendations

    def _analyze_db_config(self, config_params_data: Dict) -> List[Dict]:
        """
        Analyzes database configuration parameters and suggests tuning.
        This is a simplified example; real-world would involve more specific thresholds and DB type nuances.
        """
        recommendations = []

        if config_params_data:
            # Example: Check for common PostgreSQL parameters
            if config_params_data.get('shared_buffers') and config_params_data['shared_buffers'].lower() == '32mb':
                 recommendations.append({
                    "type": "CONFIG_TWEAK",
                    "severity": "medium",
                    "description": "Consider increasing `shared_buffers`. 32MB is often too low for modern servers. Start with 25% of system RAM.",
                    "parameter": "shared_buffers",
                    "current_value": "32MB",
                    "suggested_action": "Adjust to a higher value based on available RAM (e.g., 2GB-8GB)."
                })
            
            if config_params_data.get('work_mem') and int(config_params_data['work_mem'].replace('MB', '').strip()) < 64:
                 recommendations.append({
                    "type": "CONFIG_TWEAK",
                    "severity": "low",
                    "description": "Increase `work_mem` if complex sorts/hashes are spilling to disk.",
                    "parameter": "work_mem",
                    "current_value": config_params_data['work_mem'],
                    "suggested_action": "Increase to 64MB or 128MB, monitor performance."
                })
            
            # Add more config checks for other DB types or specific versions

        if not recommendations:
            recommendations.append({"type": "INFO", "description": "No immediate configuration tuning recommendations based on current metrics."})

        return recommendations

    def _generate_overall_summary(self, index_recs: List, slow_query_recs: List, config_recs: List) -> str:
        """Generates a high-level summary of the analysis findings."""
        summary_parts = []
        if index_recs and any(rec.get('type') != 'INFO' for rec in index_recs):
            summary_parts.append(f"{len([r for r in index_recs if r.get('type') != 'INFO'])} index recommendations identified (e.g., missing or unused indexes).")
        if slow_query_recs and any(rec.get('type') != 'INFO' for rec in slow_query_recs):
            summary_parts.append(f"{len([r for r in slow_query_recs if r.get('type') != 'INFO'])} slow queries require optimization.")
        if config_recs and any(rec.get('type') != 'INFO' for rec in config_recs):
            summary_parts.append(f"{len([r for r in config_recs if r.get('type') != 'INFO'])} configuration parameters could be tuned.")
        
        if not summary_parts:
            return "No critical optimization issues identified in this analysis cycle. Database performance appears healthy based on collected metrics."
        
        return "Key optimization opportunities identified:\n" + "\n".join([f"- {s}" for s in summary_parts])


    def _create_and_save_report(self, user_id: int, db_id: int, task_id: int,
                                title: str, summary: str, recommendations: Dict, raw_data: Dict) -> Dict:
        """Creates and saves a new report entry in the DBOptiFlow database."""
        try:
            new_report = Report(
                user_id=user_id,
                db_id=db_id,
                task_id=task_id,
                report_type=ReportType.PERFORMANCE_SUMMARY, # Or more specific based on analysis
                title=title,
                summary=summary,
                recommendations=recommendations,
                raw_data=raw_data
            )
            db.session.add(new_report)
            db.session.commit()
            logger.info(f"Report {new_report.id} created for DB {db_id} from Task {task_id}")
            return new_report.to_dict()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to create report for DB {db_id}, Task {task_id}: {e}", exc_info=True)
            raise
```