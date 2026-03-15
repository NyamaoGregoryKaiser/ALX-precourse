from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.cart_service import CartService
from app.utils.decorators import customer_required
from app.utils.errors import NotFoundError, BadRequestError
import logging

cart_bp = Blueprint('cart_bp', __name__)
api = Api(cart_bp)
logger = logging.getLogger(__name__)

class CartItemsResource(Resource):
    @customer_required()
    def get(self):
        """
        Get User's Cart Items (Customer/Admin Only)
        ---
        security:
          - Bearer: []
        responses:
          200:
            description: List of cart items
            schema:
              type: array
              items:
                type: object
                properties:
                  product_id: {type: integer}
                  product_name: {type: string}
                  quantity: {type: integer}
                  price_at_addition: {type: number}
                  total_item_price: {type: number}
        """
        user_id = get_jwt_identity()['id']
        try:
            cart_items = CartService.get_cart_items(user_id)
            cart_items_data = []
            for item in cart_items:
                if item.product:
                    cart_items_data.append({
                        'product_id': item.product_id,
                        'product_name': item.product.name,
                        'quantity': item.quantity,
                        'price_at_addition': float(item.price_at_addition),
                        'total_item_price': float(item.quantity * item.price_at_addition)
                    })
            return cart_items_data, 200
        except Exception as e:
            logger.error(f"Error getting cart items for user {user_id}: {e}")
            raise BadRequestError(f"Failed to retrieve cart items: {e}")

    @customer_required()
    def post(self):
        """
        Add Product to Cart (Customer/Admin Only)
        ---
        parameters:
          - in: body
            name: body
            schema:
              type: object
              required:
                - product_id
                - quantity
              properties:
                product_id:
                  type: integer
                  description: ID of the product to add
                quantity:
                  type: integer
                  default: 1
                  description: Quantity to add (must be > 0)
        security:
          - Bearer: []
        responses:
          200:
            description: Product added/updated in cart
            schema:
              type: object
              properties:
                message: {type: string}
                product_id: {type: integer}
                quantity: {type: integer}
          400:
            description: Bad request (e.g., invalid quantity, out of stock)
          401:
            description: Unauthorized
          403:
            description: Forbidden (not a customer/admin)
          404:
            description: Product not found
        """
        user_id = get_jwt_identity()['id']
        data = request.get_json()
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)

        if not product_id:
            raise BadRequestError("Product ID is required.")
        if not isinstance(product_id, int) or product_id <= 0:
            raise BadRequestError("Invalid Product ID.")
        if not isinstance(quantity, int) or quantity <= 0:
            raise BadRequestError("Quantity must be a positive integer.")

        try:
            cart_item = CartService.add_to_cart(user_id, product_id, quantity)
            return {
                'message': 'Product added/updated in cart',
                'product_id': cart_item.product_id,
                'quantity': cart_item.quantity
            }, 200
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error adding product {product_id} to cart for user {user_id}: {e}")
            raise BadRequestError(f"Failed to add product to cart: {e}")

    @customer_required()
    def delete(self):
        """
        Clear User's Cart (Customer/Admin Only)
        ---
        security:
          - Bearer: []
        responses:
          204:
            description: Cart cleared successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (not a customer/admin)
          404:
            description: Cart not found
        """
        user_id = get_jwt_identity()['id']
        try:
            CartService.clear_cart(user_id)
            return '', 204
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error clearing cart for user {user_id}: {e}")
            raise BadRequestError(f"Failed to clear cart: {e}")

class CartItemResource(Resource):
    @customer_required()
    def put(self, product_id):
        """
        Update Quantity of a Product in Cart (Customer/Admin Only)
        ---
        parameters:
          - in: path
            name: product_id
            type: integer
            required: true
            description: ID of the product in the cart
          - in: body
            name: body
            schema:
              type: object
              required:
                - quantity
              properties:
                quantity:
                  type: integer
                  description: New quantity for the product (0 or less to remove)
        security:
          - Bearer: []
        responses:
          200:
            description: Cart item quantity updated
          204:
            description: Cart item removed (if quantity was 0 or less)
          400:
            description: Bad request (e.g., invalid quantity, out of stock)
          401:
            description: Unauthorized
          403:
            description: Forbidden (not a customer/admin)
          404:
            description: Product not found in cart or product itself not found
        """
        user_id = get_jwt_identity()['id']
        data = request.get_json()
        quantity = data.get('quantity')

        if not isinstance(quantity, int):
            raise BadRequestError("Quantity must be an integer.")
        if not isinstance(product_id, int) or product_id <= 0:
            raise BadRequestError("Invalid Product ID.")

        try:
            if quantity <= 0:
                CartService.remove_from_cart(user_id, product_id)
                return '', 204
            else:
                cart_item = CartService.update_cart_item_quantity(user_id, product_id, quantity)
                return {
                    'message': 'Cart item quantity updated',
                    'product_id': cart_item.product_id,
                    'quantity': cart_item.quantity
                }, 200
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating product {product_id} quantity for user {user_id}: {e}")
            raise BadRequestError(f"Failed to update cart item: {e}")

    @customer_required()
    def delete(self, product_id):
        """
        Remove a Product from Cart (Customer/Admin Only)
        ---
        parameters:
          - in: path
            name: product_id
            type: integer
            required: true
            description: ID of the product to remove from cart
        security:
          - Bearer: []
        responses:
          204:
            description: Product removed from cart successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (not a customer/admin)
          404:
            description: Product not found in cart
        """
        user_id = get_jwt_identity()['id']
        if not isinstance(product_id, int) or product_id <= 0:
            raise BadRequestError("Invalid Product ID.")
            
        try:
            CartService.remove_from_cart(user_id, product_id)
            return '', 204
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error removing product {product_id} from cart for user {user_id}: {e}")
            raise BadRequestError(f"Failed to remove product from cart: {e}")

api.add_resource(CartItemsResource, '/')
api.add_resource(CartItemResource, '/<int:product_id>')