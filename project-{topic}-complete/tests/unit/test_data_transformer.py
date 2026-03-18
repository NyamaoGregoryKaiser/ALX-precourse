```python
import pytest
from app.services.data_transformer import DataTransformer

@pytest.fixture
def transformer():
    return DataTransformer()

def test_no_transformation(transformer):
    data = [{"id": 1, "value": 10}, {"id": 2, "value": 20}]
    config = {}
    transformed = transformer.transform(data, config)
    assert transformed == data

def test_apply_filters_eq(transformer):
    data = [
        {"id": 1, "category": "A", "value": 10},
        {"id": 2, "category": "B", "value": 20},
        {"id": 3, "category": "A", "value": 30},
    ]
    filters = {"category": {"$eq": "A"}}
    transformed = transformer._apply_filters(data, filters)
    assert transformed == [
        {"id": 1, "category": "A", "value": 10},
        {"id": 3, "category": "A", "value": 30},
    ]

def test_apply_filters_gt(transformer):
    data = [
        {"id": 1, "value": 10},
        {"id": 2, "value": 20},
        {"id": 3, "value": 30},
    ]
    filters = {"value": {"$gt": 15}}
    transformed = transformer._apply_filters(data, filters)
    assert transformed == [
        {"id": 2, "value": 20},
        {"id": 3, "value": 30},
    ]

def test_apply_filters_in(transformer):
    data = [
        {"id": 1, "category": "A"},
        {"id": 2, "category": "B"},
        {"id": 3, "category": "C"},
    ]
    filters = {"category": {"$in": ["A", "C"]}}
    transformed = transformer._apply_filters(data, filters)
    assert transformed == [
        {"id": 1, "category": "A"},
        {"id": 3, "category": "C"},
    ]

def test_aggregate_sum(transformer):
    data = [
        {"month": "Jan", "sales": 100, "product": "A"},
        {"month": "Jan", "sales": 50, "product": "B"},
        {"month": "Feb", "sales": 200, "product": "A"},
    ]
    aggregation_config = {
        "group_by": ["month"],
        "metrics": {"total_sales": {"field": "sales", "op": "sum"}}
    }
    transformed = transformer._aggregate_data(data, aggregation_config)
    assert transformed == [
        {"month": "Jan", "total_sales": 150},
        {"month": "Feb", "total_sales": 200},
    ]

def test_aggregate_avg_and_count(transformer):
    data = [
        {"region": "East", "rating": 4, "users": 10},
        {"region": "East", "rating": 5, "users": 20},
        {"region": "West", "rating": 3, "users": 5},
    ]
    aggregation_config = {
        "group_by": ["region"],
        "metrics": {
            "avg_rating": {"field": "rating", "op": "avg"},
            "user_count": {"field": "users", "op": "count"}
        }
    }
    transformed = transformer._aggregate_data(data, aggregation_config)
    # Using sorted for predictable order in assertion
    transformed.sort(key=lambda x: x["region"])
    expected = [
        {"region": "East", "avg_rating": 4.5, "user_count": 2},
        {"region": "West", "avg_rating": 3.0, "user_count": 1},
    ]
    expected.sort(key=lambda x: x["region"])
    assert transformed == expected

def test_column_selection_and_renaming(transformer):
    data = [
        {"id": 1, "product_name": "Laptop", "price": 1200},
        {"id": 2, "product_name": "Mouse", "price": 25},
    ]
    config = {
        "columns": [
            {"field": "product_name", "label": "Product"},
            {"field": "price", "label": "Price ($)"}
        ]
    }
    transformed = transformer.transform(data, config)
    assert transformed == [
        {"Product": "Laptop", "Price ($)": 1200},
        {"Product": "Mouse", "Price ($)": 25},
    ]

def test_full_transformation_pipeline(transformer):
    data = [
        {"id": 1, "month": "Jan", "category": "Electronics", "sales": 100},
        {"id": 2, "month": "Jan", "category": "Clothing", "sales": 50},
        {"id": 3, "month": "Feb", "category": "Electronics", "sales": 200},
        {"id": 4, "month": "Feb", "category": "Books", "sales": 75},
        {"id": 5, "month": "Mar", "category": "Electronics", "sales": 150},
    ]
    config = {
        "filters": {"category": {"$eq": "Electronics"}},
        "aggregation": {
            "group_by": ["month"],
            "metrics": {"total_sales": {"field": "sales", "op": "sum"}}
        },
        "columns": [
            {"field": "month", "label": "Sale Month"},
            {"field": "total_sales", "label": "Revenue"}
        ]
    }
    transformed = transformer.transform(data, config)
    transformed.sort(key=lambda x: x["Sale Month"])
    expected = [
        {"Sale Month": "Feb", "Revenue": 200},
        {"Sale Month": "Jan", "Revenue": 100},
        {"Sale Month": "Mar", "Revenue": 150},
    ]
    expected.sort(key=lambda x: x["Sale Month"])
    assert transformed == expected
```