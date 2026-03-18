```python
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class DataTransformer:
    """
    Service for transforming raw data into a format suitable for visualization.
    This would involve operations like pivoting, aggregation, filtering, etc.
    For this example, it primarily performs basic column selection and type conversion.
    """

    def _apply_filters(self, data: List[Dict[str, Any]], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Applies basic filters to the data.
        `filters` format: {"column_name": {"operator": "value"}} (e.g., {"sales": {"$gt": 100}})
        This is a simplified example, a real-world implementation would be more robust.
        """
        if not filters:
            return data

        filtered_data = []
        for row in data:
            match = True
            for col, condition in filters.items():
                if col not in row:
                    match = False
                    break

                value = row[col]
                if isinstance(condition, dict):
                    if "$eq" in condition and value != condition["$eq"]:
                        match = False
                        break
                    if "$gt" in condition and not (isinstance(value, (int, float)) and value > condition["$gt"]):
                        match = False
                        break
                    if "$lt" in condition and not (isinstance(value, (int, float)) and value < condition["$lt"]):
                        match = False
                        break
                    if "$in" in condition and value not in condition["$in"]:
                        match = False
                        break
                elif value != condition: # Direct equality if not a dict
                    match = False
                    break
            if match:
                filtered_data.append(row)
        return filtered_data

    def _aggregate_data(self, data: List[Dict[str, Any]], aggregation_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Aggregates data based on the provided configuration.
        `aggregation_config` format: { "group_by": ["column1", "column2"], "metrics": {"sum_sales": {"field": "sales", "op": "sum"}} }
        This is a simplified example.
        """
        if not aggregation_config or not aggregation_config.get("group_by") or not aggregation_config.get("metrics"):
            return data

        group_by_cols = aggregation_config["group_by"]
        metrics = aggregation_config["metrics"]

        # Grouping
        grouped_data = {}
        for row in data:
            key_values = tuple(row.get(col) for col in group_by_cols)
            if key_values not in grouped_data:
                grouped_data[key_values] = []
            grouped_data[key_values].append(row)

        # Aggregating
        transformed_data = []
        for key_values, group in grouped_data.items():
            aggregated_row = {col: val for col, val in zip(group_by_cols, key_values)}
            for metric_name, metric_def in metrics.items():
                field = metric_def["field"]
                op = metric_def["op"]
                values_to_agg = [r.get(field) for r in group if r.get(field) is not None and isinstance(r.get(field), (int, float))]

                if op == "sum":
                    aggregated_row[metric_name] = sum(values_to_agg)
                elif op == "avg":
                    aggregated_row[metric_name] = sum(values_to_agg) / len(values_to_agg) if values_to_agg else 0
                elif op == "count":
                    aggregated_row[metric_name] = len(values_to_agg)
                elif op == "min":
                    aggregated_row[metric_name] = min(values_to_agg) if values_to_agg else None
                elif op == "max":
                    aggregated_row[metric_name] = max(values_to_agg) if values_to_agg else None
                # Add more aggregation operations
            transformed_data.append(aggregated_row)

        return transformed_data


    def transform(self, raw_data: List[Dict[str, Any]], config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Transforms raw data based on a visualization configuration.
        """
        logger.info(f"Transforming {len(raw_data)} rows with config: {config}")
        transformed = list(raw_data) # Start with a copy

        # Example transformation steps based on config:
        # 1. Filtering
        filters = config.get("filters")
        if filters:
            transformed = self._apply_filters(transformed, filters)

        # 2. Aggregation
        aggregation = config.get("aggregation")
        if aggregation:
            transformed = self._aggregate_data(transformed, aggregation)

        # 3. Column selection/renaming (simplified)
        columns = config.get("columns") # e.g., [{"field": "sales", "label": "Total Sales"}, {"field": "month"}]
        if columns:
            selected_data = []
            for row in transformed:
                new_row = {}
                for col_def in columns:
                    field = col_def["field"]
                    label = col_def.get("label", field)
                    if field in row:
                        new_row[label] = row[field]
                selected_data.append(new_row)
            transformed = selected_data


        # Further transformations can be added here (e.g., pivoting, sorting, type conversions)

        logger.info(f"Transformed data to {len(transformed)} rows.")
        return transformed

data_transformer = DataTransformer()
```