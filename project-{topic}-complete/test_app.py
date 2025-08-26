```python
import pytest
import json
from app import app, db, Product

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///:memory:" # Use in-memory DB for testing
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.session.remove()
            db.drop_all()


def test_create_product(client):
    data = {'name': 'Test Product', 'description': 'This is a test product', 'price': 10.99}
    response = client.post('/products', json=data)
    assert response.status_code == 201
    assert json.loads(response.data)['name'] == 'Test Product'

# Add more test cases for GET, UPDATE, DELETE, and optimized query


```