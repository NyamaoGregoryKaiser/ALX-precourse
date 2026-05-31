import pandas as pd
from io import StringIO, BytesIO
import json
import logging
from app.errors import BadRequestError, InternalServerError

log = logging.getLogger(__name__)

class DataProcessor:
    """
    Service for processing raw data from various sources (CSV, Excel, Database, API).
    Includes methods for parsing, schema detection, and applying transformations.
    """

    SUPPORTED_FILE_TYPES = {
        'csv': ['csv', 'text/csv'],
        'excel': ['xls', 'xlsx', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        # 'json': ['json', 'application/json'] # Not implemented for direct file upload yet
    }

    def __init__(self):
        pass

    def _get_file_type_from_filename(self, filename):
        """Infers file type from filename extension."""
        if not filename:
            return None
        ext = filename.split('.')[-1].lower()
        for file_type, extensions in self.SUPPORTED_FILE_TYPES.items():
            if ext in extensions:
                return file_type
        return None

    def _get_file_type_from_mimetype(self, mimetype):
        """Infers file type from mimetype."""
        if not mimetype:
            return None
        mimetype = mimetype.lower()
        for file_type, mimetypes in self.SUPPORTED_FILE_TYPES.items():
            if mimetype in mimetypes:
                return file_type
        return None

    def load_file_data(self, file_storage, file_type=None):
        """
        Loads data from a Werkzeug FileStorage object into a pandas DataFrame.
        Automatically detects file type if not provided.
        """
        if not file_storage:
            raise BadRequestError("No file provided for data loading.")

        if not file_type:
            file_type = self._get_file_type_from_filename(file_storage.filename)
            if not file_type:
                file_type = self._get_file_type_from_mimetype(file_storage.mimetype)

        if not file_type:
            raise BadRequestError(f"Unsupported file type. Could not infer type from filename '{file_storage.filename}' or mimetype '{file_storage.mimetype}'.")

        try:
            if file_type == 'csv':
                # Read as string to handle encoding, then use StringIO
                content = file_storage.read().decode('utf-8')
                df = pd.read_csv(StringIO(content))
            elif file_type == 'excel':
                # Read as bytes for Excel
                df = pd.read_excel(BytesIO(file_storage.read()))
            else:
                raise BadRequestError(f"Unsupported file type: {file_type}")
            return df
        except Exception as e:
            log.error(f"Error loading {file_type} data: {e}", exc_info=True)
            raise InternalServerError(f"Failed to load data from file: {e}")

    def detect_schema(self, df: pd.DataFrame):
        """
        Detects basic schema information (columns, dtypes) from a pandas DataFrame.
        Returns a dictionary suitable for storage.
        """
        if df.empty:
            return {"columns": [], "rows": 0, "dtypes": {}}

        schema = {
            "columns": df.columns.tolist(),
            "rows": len(df),
            "dtypes": {col: str(df[col].dtype) for col in df.columns}
        }
        # Example of adding value counts for categorical data
        for col in df.columns:
            if df[col].dtype == 'object' and df[col].nunique() < 20: # Heuristic for categorical
                schema['dtypes'][col] = 'category'
                # schema.setdefault('value_counts', {})[col] = df[col].value_counts().to_dict() # Could be too large
        return schema

    def apply_query_and_transformations(self, df: pd.DataFrame, query_json: dict):
        """
        Applies a series of transformations and queries to a DataFrame based on query_json.
        This mimics SQL-like operations (select, filter, group by, aggregate, sort, limit).

        Args:
            df (pd.DataFrame): The input DataFrame.
            query_json (dict): A dictionary specifying transformations.
                               e.g., {
                                   "columns": ["col1", "col2"],
                                   "filters": {"col1": {"operator": ">", "value": 10}},
                                   "group_by": ["col1"],
                                   "aggregate": {"col2": "sum"},
                                   "sort_by": [{"column": "col1", "order": "asc"}],
                                   "limit": 100
                               }

        Returns:
            pd.DataFrame: The transformed DataFrame.
        """
        if df.empty:
            return pd.DataFrame()

        processed_df = df.copy()

        # 1. Select columns
        if query_json.get('columns'):
            valid_columns = [col for col in query_json['columns'] if col in processed_df.columns]
            if valid_columns:
                processed_df = processed_df[valid_columns]
            else:
                log.warning(f"No valid columns found in query_json for selection. Skipping column selection.")
                # Optionally raise error if no columns are valid
                # raise BadRequestError("None of the requested columns exist in the data source.")

        # 2. Apply filters
        if query_json.get('filters'):
            for column, filter_config in query_json['filters'].items():
                if column not in processed_df.columns:
                    log.warning(f"Filter column '{column}' not found in DataFrame. Skipping filter.")
                    continue
                operator = filter_config.get('operator')
                value = filter_config.get('value')

                try:
                    if operator == '=':
                        processed_df = processed_df[processed_df[column] == value]
                    elif operator == '!=':
                        processed_df = processed_df[processed_df[column] != value]
                    elif operator == '>':
                        processed_df = processed_df[processed_df[column] > value]
                    elif operator == '>=':
                        processed_df = processed_df[processed_df[column] >= value]
                    elif operator == '<':
                        processed_df = processed_df[processed_df[column] < value]
                    elif operator == '<=':
                        processed_df = processed_df[processed_df[column] <= value]
                    elif operator == 'in':
                        if isinstance(value, list):
                            processed_df = processed_df[processed_df[column].isin(value)]
                        else:
                            log.warning(f"Filter 'in' operator requires a list value for column '{column}'.")
                    elif operator == 'not_in':
                        if isinstance(value, list):
                            processed_df = processed_df[~processed_df[column].isin(value)]
                        else:
                            log.warning(f"Filter 'not_in' operator requires a list value for column '{column}'.")
                    elif operator == 'like': # Simple string contains for now
                        if isinstance(value, str):
                            processed_df = processed_df[processed_df[column].astype(str).str.contains(value, case=False, na=False)]
                        else:
                            log.warning(f"Filter 'like' operator requires a string value for column '{column}'.")
                    else:
                        log.warning(f"Unsupported filter operator '{operator}' for column '{column}'.")
                except TypeError as te:
                    log.warning(f"Type error applying filter for column '{column}': {te}. Skipping filter.")
                except Exception as e:
                    log.error(f"Error applying filter for column '{column}': {e}", exc_info=True)
                    raise InternalServerError(f"Failed to apply filter for column '{column}'.")


        # 3. Apply Group By and Aggregate
        if query_json.get('group_by') and query_json.get('aggregate'):
            group_by_cols = [col for col in query_json['group_by'] if col in processed_df.columns]
            aggregate_funcs = {}
            for col, agg_func in query_json['aggregate'].items():
                if col in processed_df.columns:
                    aggregate_funcs[col] = agg_func
                else:
                    log.warning(f"Aggregate column '{col}' not found in DataFrame. Skipping aggregate.")

            if group_by_cols and aggregate_funcs:
                try:
                    processed_df = processed_df.groupby(group_by_cols).agg(aggregate_funcs).reset_index()
                except Exception as e:
                    log.error(f"Error applying group by and aggregate: {e}", exc_info=True)
                    raise InternalServerError(f"Failed to apply group by/aggregate: {e}")
            elif not group_by_cols and aggregate_funcs:
                # If only aggregate is provided without group_by, apply across entire DataFrame
                try:
                    processed_df = processed_df.agg(aggregate_funcs).to_frame().T
                except Exception as e:
                    log.error(f"Error applying aggregate without group by: {e}", exc_info=True)
                    raise InternalServerError(f"Failed to apply aggregate: {e}")
            else:
                log.info("Group by or aggregate configuration incomplete. Skipping.")

        # 4. Sort
        if query_json.get('sort_by'):
            sort_cols = []
            sort_orders = []
            for sort_item in query_json['sort_by']:
                col = sort_item.get('column')
                order = sort_item.get('order', 'asc').lower()
                if col in processed_df.columns:
                    sort_cols.append(col)
                    sort_orders.append(True if order == 'asc' else False)
                else:
                    log.warning(f"Sort column '{col}' not found in DataFrame. Skipping sort by this column.")

            if sort_cols:
                try:
                    processed_df = processed_df.sort_values(by=sort_cols, ascending=sort_orders)
                except Exception as e:
                    log.error(f"Error applying sort: {e}", exc_info=True)
                    raise InternalServerError(f"Failed to apply sort: {e}")

        # 5. Limit
        if query_json.get('limit') is not None:
            limit_val = int(query_json['limit'])
            if limit_val > 0:
                processed_df = processed_df.head(limit_val)

        return processed_df

    def format_for_visualization(self, df: pd.DataFrame, visualization_config: dict):
        """
        Formats the DataFrame into a JSON-serializable structure suitable for client-side
        visualization libraries (e.g., [{x: 1, y: 10}, {x: 2, y: 20}]).
        The exact format depends on the `chart_type` in `visualization_config`.
        """
        if df.empty:
            return []

        chart_type = visualization_config.get('chart_type')
        x_axis = visualization_config.get('x_axis')
        y_axis = visualization_config.get('y_axis')
        color_by = visualization_config.get('color_by')

        if chart_type == 'table':
            return df.to_dict(orient='records')

        if not x_axis or not y_axis:
            log.warning(f"X or Y axis not defined for chart type '{chart_type}'. Returning raw records.")
            return df.to_dict(orient='records')

        if x_axis not in df.columns or y_axis not in df.columns:
            log.warning(f"X or Y axis columns '{x_axis}', '{y_axis}' not found in data. Returning raw records.")
            return df.to_dict(orient='records')

        # Basic format for bar/line/scatter
        data = []
        if color_by and color_by in df.columns:
            # Group by color_by for series data
            for name, group in df.groupby(color_by):
                series_data = {
                    'name': name,
                    'data': group[[x_axis, y_axis]].rename(columns={x_axis: 'x', y_axis: 'y'}).to_dict(orient='records')
                }
                data.append(series_data)
        else:
            # Single series
            data = df[[x_axis, y_axis]].rename(columns={x_axis: 'x', y_axis: 'y'}).to_dict(orient='records')

        return data

# Export a singleton instance
data_processor = DataProcessor()