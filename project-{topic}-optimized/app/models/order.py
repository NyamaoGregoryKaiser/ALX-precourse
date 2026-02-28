import datetime
from enum import Enum
from app.database import db
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class OrderStatus(Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    SHIPPED = 'shipped'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'

    def __str__(self):
        return self.value

class Order(db.Model):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    order_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(db.Enum(OrderStatus, name='order_statuses'), default=OrderStatus.PENDING)
    total_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    shipping_address = Column(Text, nullable=False)
    billing_address = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    items = relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
    # customer relationship is in User model via backref

    def __repr__(self):
        return f'<Order {self.id} by User {self.user_id}>'

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Numeric(10, 2), nullable=False) # Price when ordered

    product = relationship('Product', lazy=True)

    def __repr__(self):
        return f'<OrderItem {self.id} (Order: {self.order_id}, Product: {self.product_id})>'