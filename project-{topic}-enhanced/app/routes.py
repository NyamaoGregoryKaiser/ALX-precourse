from flask import Blueprint, render_template, redirect, url_for, request, flash, session
import requests # Used for making requests to the backend API from the frontend routes
from app.utils.errors import APIError
import os
import logging

main_bp = Blueprint('main', __name__)
logger = logging.getLogger(__name__)

# Base URL for the API, could be environment variable
API_BASE_URL = os.environ.get('FLASK_API_URL', 'http://localhost:5000/api')

# Helper to make API calls
def call_api(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    url = f"{API_BASE_URL}{path}"
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, params=data)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers)
        elif method == 'PUT':
            response = requests.put(url, json=data, headers=headers)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError("Unsupported HTTP method")

        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        return response.json(), response.status_code
    except requests.exceptions.HTTPError as e:
        logger.error(f"API HTTP Error for {path}: {e.response.status_code} - {e.response.text}")
        try:
            error_data = e.response.json()
            message = error_data.get('message', 'An API error occurred.')
        except ValueError:
            message = e.response.text
        raise APIError(message, status_code=e.response.status_code)
    except requests.exceptions.ConnectionError as e:
        logger.critical(f"API Connection Error for {path}: {e}")
        raise APIError("Could not connect to the API server. Please try again later.", status_code=503)
    except Exception as e:
        logger.critical(f"Unexpected error calling API {path}: {e}")
        raise APIError(f"An unexpected error occurred: {e}", status_code=500)


@main_bp.route('/')
def index():
    try:
        # Fetch products for display on homepage
        products, status_code = call_api('GET', '/products')
        categories, status_code = call_api('GET', '/products/categories')
        return render_template('index.html', products=products, categories=categories)
    except APIError as e:
        flash(f"Error fetching data: {e.message}", 'danger')
        return render_template('index.html', products=[], categories=[]), e.status_code
    except Exception as e:
        flash(f"An unexpected error occurred: {e}", 'danger')
        return render_template('index.html', products=[], categories=[]), 500


@main_bp.route('/products')
def product_list():
    category_id = request.args.get('category_id', type=int)
    search_term = request.args.get('search_term', type=str)
    
    params = {}
    if category_id:
        params['category_id'] = category_id
    if search_term:
        params['search_term'] = search_term

    try:
        products, _ = call_api('GET', '/products', data=params)
        categories, _ = call_api('GET', '/products/categories')
        return render_template('products.html', products=products, categories=categories, 
                                selected_category_id=category_id, search_term=search_term)
    except APIError as e:
        flash(f"Error fetching products: {e.message}", 'danger')
        return render_template('products.html', products=[], categories=[]), e.status_code

@main_bp.route('/products/<int:product_id>')
def product_detail(product_id):
    try:
        product, _ = call_api('GET', f'/products/{product_id}')
        return render_template('product_detail.html', product=product)
    except APIError as e:
        flash(f"Error fetching product: {e.message}", 'danger')
        return redirect(url_for('main.product_list')), e.status_code

@main_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        try:
            response, status_code = call_api('POST', '/auth/register', data={
                'username': username,
                'email': email,
                'password': password
            })
            if status_code == 201:
                flash("Registration successful! Please log in.", 'success')
                return redirect(url_for('main.login'))
            else:
                flash(response.get('message', 'Registration failed.'), 'danger')
        except APIError as e:
            flash(f"Registration failed: {e.message}", 'danger')
        except Exception as e:
            flash(f"An unexpected error occurred: {e}", 'danger')
    return render_template('register.html')


@main_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        try:
            response, status_code = call_api('POST', '/auth/login', data={
                'email': email,
                'password': password
            })
            if status_code == 200:
                session['access_token'] = response['access_token']
                session['refresh_token'] = response['refresh_token']
                flash("Logged in successfully!", 'success')
                return redirect(url_for('main.index'))
            else:
                flash(response.get('message', 'Login failed.'), 'danger')
        except APIError as e:
            flash(f"Login failed: {e.message}", 'danger')
        except Exception as e:
            flash(f"An unexpected error occurred: {e}", 'danger')
    return render_template('login.html')

@main_bp.route('/logout')
def logout():
    session.pop('access_token', None)
    session.pop('refresh_token', None)
    flash("You have been logged out.", 'info')
    return redirect(url_for('main.index'))

@main_bp.route('/cart', methods=['GET'])
def view_cart():
    if 'access_token' not in session:
        flash("You need to be logged in to view your cart.", 'warning')
        return redirect(url_for('main.login'))
    
    try:
        cart_items, _ = call_api('GET', '/cart', token=session['access_token'])
        total_cart_amount = sum(item['total_item_price'] for item in cart_items)
        return render_template('cart.html', cart_items=cart_items, total_cart_amount=total_cart_amount)
    except APIError as e:
        flash(f"Error fetching cart: {e.message}", 'danger')
        return render_template('cart.html', cart_items=[], total_cart_amount=0), e.status_code
    except Exception as e:
        flash(f"An unexpected error occurred: {e}", 'danger')
        return render_template('cart.html', cart_items=[], total_cart_amount=0), 500

@main_bp.route('/cart/add', methods=['POST'])
def add_to_cart():
    if 'access_token' not in session:
        flash("You need to be logged in to add items to your cart.", 'warning')
        return redirect(url_for('main.login'))
    
    product_id = request.form.get('product_id', type=int)
    quantity = request.form.get('quantity', type=int, default=1)

    if not product_id or quantity <= 0:
        flash("Invalid product or quantity.", 'danger')
        return redirect(request.referrer or url_for('main.index'))

    try:
        call_api('POST', '/cart', data={'product_id': product_id, 'quantity': quantity}, token=session['access_token'])
        flash("Product added to cart!", 'success')
    except APIError as e:
        flash(f"Error adding to cart: {e.message}", 'danger')
    except Exception as e:
        flash(f"An unexpected error occurred: {e}", 'danger')
    
    return redirect(request.referrer or url_for('main.view_cart'))

@main_bp.route('/cart/update/<int:product_id>', methods=['POST'])
def update_cart_item():
    if 'access_token' not in session:
        flash("You need to be logged in to update your cart.", 'warning')
        return redirect(url_for('main.login'))
    
    product_id = request.form.get('product_id', type=int)
    quantity = request.form.get('quantity', type=int)

    if not product_id or quantity is None:
        flash("Invalid product or quantity.", 'danger')
        return redirect(url_for('main.view_cart'))

    try:
        call_api('PUT', f'/cart/{product_id}', data={'quantity': quantity}, token=session['access_token'])
        flash("Cart updated!", 'success')
    except APIError as e:
        flash(f"Error updating cart: {e.message}", 'danger')
    except Exception as e:
        flash(f"An unexpected error occurred: {e}", 'danger')
    
    return redirect(url_for('main.view_cart'))

@main_bp.route('/cart/remove/<int:product_id>', methods=['POST'])
def remove_from_cart():
    if 'access_token' not in session:
        flash("You need to be logged in to modify your cart.", 'warning')
        return redirect(url_for('main.login'))
    
    product_id = request.form.get('product_id', type=int)
    if not product_id:
        flash("Invalid product.", 'danger')
        return redirect(url_for('main.view_cart'))

    try:
        call_api('DELETE', f'/cart/{product_id}', token=session['access_token'])
        flash("Product removed from cart!", 'success')
    except APIError as e:
        flash(f"Error removing from cart: {e.message}", 'danger')
    except Exception as e:
        flash(f"An unexpected error occurred: {e}", 'danger')
    
    return redirect(url_for('main.view_cart'))

@main_bp.route('/checkout', methods=['GET', 'POST'])
def checkout():
    if 'access_token' not in session:
        flash("You need to be logged in to checkout.", 'warning')
        return redirect(url_for('main.login'))

    if request.method == 'POST':
        shipping_address = request.form.get('shipping_address')
        if not shipping_address:
            flash("Shipping address is required.", 'danger')
            return render_template('checkout.html', shipping_address=shipping_address) # Pre-fill with user input if possible

        try:
            order_response, status_code = call_api('POST', '/orders', 
                                                   data={'shipping_address': shipping_address}, 
                                                   token=session['access_token'])
            if status_code == 201:
                flash(f"Order #{order_response['order_id']} placed successfully! Total: ${order_response['total_amount']}", 'success')
                return redirect(url_for('main.my_orders'))
            else:
                flash(order_response.get('message', 'Failed to place order.'), 'danger')
        except APIError as e:
            flash(f"Failed to place order: {e.message}", 'danger')
        except Exception as e:
            flash(f"An unexpected error occurred: {e}", 'danger')
            
    # For GET request or if POST fails, try to get current cart items to display
    cart_items = []
    total_cart_amount = 0
    try:
        cart_items, _ = call_api('GET', '/cart', token=session['access_token'])
        total_cart_amount = sum(item['total_item_price'] for item in cart_items)
    except APIError as e:
        flash(f"Could not load cart for checkout: {e.message}", 'warning')
    except Exception as e:
        flash(f"An unexpected error occurred while loading cart: {e}", 'warning')

    if not cart_items:
        flash("Your cart is empty. Please add items before checking out.", 'warning')
        return redirect(url_for('main.index'))

    return render_template('checkout.html', cart_items=cart_items, total_cart_amount=total_cart_amount)


@main_bp.route('/my_orders')
def my_orders():
    if 'access_token' not in session:
        flash("You need to be logged in to view your orders.", 'warning')
        return redirect(url_for('main.login'))

    try:
        orders, _ = call_api('GET', '/orders', token=session['access_token'])
        return render_template('my_orders.html', orders=orders)
    except APIError as e:
        flash(f"Error fetching orders: {e.message}", 'danger')
        return render_template('my_orders.html', orders=[]), e.status_code
    except Exception as e:
        flash(f"An unexpected error occurred: {e}", 'danger')
        return render_template('my_orders.html', orders=[]), 500

@main_bp.route('/my_orders/<int:order_id>')
def order_detail(order_id):
    if 'access_token' not in session:
        flash("You need to be logged in to view order details.", 'warning')
        return redirect(url_for('main.login'))
    
    try:
        order, _ = call_api('GET', f'/orders/{order_id}', token=session['access_token'])
        return render_template('order_detail.html', order=order)
    except APIError as e:
        flash(f"Error fetching order details: {e.message}", 'danger')
        return redirect(url_for('main.my_orders')), e.status_code
    except Exception as e:
        flash(f"An unexpected error occurred: {e}", 'danger')
        return redirect(url_for('main.my_orders')), 500