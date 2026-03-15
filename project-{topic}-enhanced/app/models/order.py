from datetime import datetime
from app import db

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(50), default='pending') # e.g., 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    shipping_address = db.Column(db.Text, nullable=False)
    payment_status = db.Column(db.String(50), default='pending') # e.g., 'pending', 'paid', 'refunded'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')

    def __init__(self, user_id, total_amount, shipping_address, status='pending', payment_status='pending'):
        self.user_id = user_id
        self.total_amount = total_amount
        self.shipping_address = shipping_address
        self.status = status
        self.payment_status = payment_status

    def __repr__(self):
        return f"<Order {self.id} for User {self.user_id}>"

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_at_purchase = db.Column(db.Numeric(10, 2), nullable=False) # Price at the time of order creation

    product = db.relationship('Product', lazy=True)

    __table_args__ = (db.UniqueConstraint('order_id', 'product_id', name='_order_product_uc'),)

    def __init__(self, order_id, product_id, quantity, price_at_purchase):
        self.order_id = order_id
        self.product_id = product_id
        self.quantity = quantity
        self.price_at_purchase = price_at_purchase

    def __repr__(self):
        return f"<OrderItem {self.quantity} x Product {self.product_id} in Order {self.order_id}>"