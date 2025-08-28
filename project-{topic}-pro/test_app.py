```python
import pytest
from app import app, db, User, Metric # Import your app and models
from faker import Faker

fake = Faker()

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
        with app.app_context():
            db.drop_all()

def test_create_metric(client):
    response = client.post('/metrics', json={'metric_name': 'CPU Usage', 'value': 75.2})
    assert response.status_code == 201

# ... more tests ...

```