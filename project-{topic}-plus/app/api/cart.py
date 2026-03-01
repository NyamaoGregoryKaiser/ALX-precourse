```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, current_user
from marshmallow import ValidationError
from app import db
from app.models import Cart, CartItem, Product
from app.schemas import CartSchema, CartItemSchema
from app.utils.decorators import customer_required
import uuid

cart_bp = Blueprint('cart', __name__)
cart_schema = CartSchema()
cart_item_schema = CartItemSchema()
cart_items_schema = CartItemSchema(many=True)

@cart_bp.route('/', methods=['GET'])
@jwt_required()
@customer_required
def get_user_cart():
    """
    Get the authenticated user's shopping cart.
    ---
    get:
      summary: Get user's cart
      security:
        - BearerAuth: []
      responses:
        200:
          description: User's cart details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Cart'
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not a customer or missing permission)
        404:
          description: Cart not found
    """
    # current_user is loaded by @jwt.user_lookup_loader
    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        # A cart should always exist for a user due to user creation logic.
        # This handles an edge case or if logic was changed.
        return jsonify({"message": "Cart not found for this user."}), 404
    return jsonify(cart_schema.dump(cart)), 200

@cart_bp.route('/items', methods=['POST'])
@jwt_required()
@customer_required
def add_item_to_cart():
    """
    Add an item to the authenticated user's cart.
    ---
    post:
      summary: Add item to cart
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                product_id: { type: string, format: uuid, description: ID of the product to add }
                quantity: { type: integer, description: Quantity of the product }
      security:
        - BearerAuth: []
      responses:
        200:
          description: Item added/updated in cart
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Cart'
        400:
          description: Invalid input, product not found, or insufficient stock
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not a customer or missing permission)
    """
    try:
        data = cart_item_schema.load(request.get_json())
        product_id = data['product_id']
        quantity = data['quantity']
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    if product.stock < quantity:
        return jsonify({"message": f"Insufficient stock for {product.name}. Available: {product.stock}"}), 400

    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        return jsonify({"message": "Cart not found for this user."}), 404

    cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()

    try:
        if cart_item:
            # Update quantity if item already exists
            new_quantity = cart_item.quantity + quantity
            if product.stock < new_quantity:
                return jsonify({"message": f"Cannot add {quantity} more to cart. Total {new_quantity} exceeds available stock ({product.stock}) for {product.name}."}), 400
            cart_item.quantity = new_quantity
        else:
            # Add new item to cart
            cart_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
            db.session.add(cart_item)

        db.session.commit()
        return jsonify(cart_schema.dump(cart)), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding item to cart for user {current_user.id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@cart_bp.route('/items/<uuid:product_id>', methods=['PUT'])
@jwt_required()
@customer_required
def update_cart_item_quantity(product_id):
    """
    Update the quantity of a specific item in the authenticated user's cart.
    ---
    put:
      summary: Update cart item quantity
      parameters:
        - in: path
          name: product_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the product in the cart
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                quantity: { type: integer, description: New quantity for the product (must be >= 1) }
      security:
        - BearerAuth: []
      responses:
        200:
          description: Cart item quantity updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Cart'
        400:
          description: Invalid input or insufficient stock
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not a customer or missing permission)
        404:
          description: Cart item or product not found
    """
    try:
        data = request.get_json()
        new_quantity = data.get('quantity')
        if not isinstance(new_quantity, int) or new_quantity <= 0:
            return jsonify({"message": "Quantity must be a positive integer"}), 400
    except Exception:
        return jsonify({"message": "Invalid JSON or missing quantity"}), 400

    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        return jsonify({"message": "Cart not found for this user."}), 404

    cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()
    if not cart_item:
        return jsonify({"message": "Product not found in cart"}), 404

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"message": "Associated product not found."}), 404 # Should not happen if cart_item exists

    if product.stock < new_quantity:
        return jsonify({"message": f"Insufficient stock for {product.name}. Available: {product.stock}, Requested: {new_quantity}"}), 400

    try:
        cart_item.quantity = new_quantity
        db.session.commit()
        return jsonify(cart_schema.dump(cart)), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating cart item quantity for user {current_user.id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@cart_bp.route('/items/<uuid:product_id>', methods=['DELETE'])
@jwt_required()
@customer_required
def remove_item_from_cart(product_id):
    """
    Remove a specific item from the authenticated user's cart.
    ---
    delete:
      summary: Remove item from cart
      parameters:
        - in: path
          name: product_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the product to remove from cart
      security:
        - BearerAuth: []
      responses:
        204:
          description: Item removed from cart
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not a customer or missing permission)
        404:
          description: Cart item not found
    """
    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        return jsonify({"message": "Cart not found for this user."}), 404

    cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()
    if not cart_item:
        return jsonify({"message": "Product not found in cart"}), 404

    try:
        db.session.delete(cart_item)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error removing item from cart for user {current_user.id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@cart_bp.route('/clear', methods=['DELETE'])
@jwt_required()
@customer_required
def clear_cart():
    """
    Clear all items from the authenticated user's cart.
    ---
    delete:
      summary: Clear user's cart
      security:
        - BearerAuth: []
      responses:
        204:
          description: Cart cleared successfully
        401:
          description: Unauthorized
        403:
          description: Forbidden (Not a customer or missing permission)
        404:
          description: Cart not found
    """
    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        return jsonify({"message": "Cart not found for this user."}), 404

    try:
        for item in cart.items:
            db.session.delete(item)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error clearing cart for user {current_user.id}: {e}")
        return jsonify({"message": "Internal server error"}), 500
```