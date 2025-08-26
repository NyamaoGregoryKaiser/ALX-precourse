```python
import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from marshmallow import Schema, fields
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Model
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True) #index for faster lookups
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)

    def __repr__(self):
        return f"<Product {self.name}>"


# Marshmallow Schema for serialization/deserialization
class ProductSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    description = fields.String(required=True)
    price = fields.Float(required=True)


#API Endpoints

@app.route('/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    result = ProductSchema(many=True).dump(products)
    return jsonify(result)

@app.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    result = ProductSchema().dump(product)
    return jsonify(result)

@app.route('/products', methods=['POST'])
def create_product():
    data = request.get_json()
    schema = ProductSchema()
    errors = schema.validate(data)
    if errors:
        return jsonify(errors), 400
    new_product = Product(**data)
    db.session.add(new_product)
    db.session.commit()
    return jsonify(schema.dump(new_product)), 201

@app.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    schema = ProductSchema()
    errors = schema.validate(data)
    if errors:
        return jsonify(errors), 400
    for key, value in data.items():
        setattr(product, key, value)
    db.session.commit()
    return jsonify(schema.dump(product))

@app.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Product deleted'})

#Example of a query optimization (using raw SQL for illustration)
@app.route('/products/optimized', methods=['GET'])
def get_products_optimized():
    #Simulate a complex query needing optimization - replace with your actual query
    result = db.session.execute(text("SELECT * FROM product WHERE price > 100")).fetchall() #Add indexes as needed
    return jsonify([dict(row) for row in result]) #Convert to jsonify-able format

if __name__ == '__main__':
    db.create_all()
    app.run(debug=True)
```