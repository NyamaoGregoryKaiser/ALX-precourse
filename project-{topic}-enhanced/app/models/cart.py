from datetime import datetime
from app import db

class Cart(db.Model):
    __tablename__ = 'carts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship('CartItem', backref='cart', lazy=True, cascade='all, delete-orphan')

    def __init__(self, user_id):
        self.user_id = user_id

    def __repr__(self):
        return f"<Cart for User {self.user_id}>"

class CartItem(db.Model):
    __tablename__ = 'cart_items'
    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey('carts.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    price_at_addition = db.Column(db.Numeric(10, 2), nullable=False) # Price at the time it was added to cart
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship('Product', lazy=True)

    __table_args__ = (db.UniqueConstraint('cart_id', 'product_id', name='_cart_product_uc'),)

    def __init__(self, cart_id, product_id, quantity, price_at_addition):
        self.cart_id = cart_id
        self.product_id = product_id
        self.quantity = quantity
        self.price_at_addition = price_at_addition

    def __repr__(self):
        return f"<CartItem {self.quantity} x Product {self.product_id} in Cart {self.cart_id}>"