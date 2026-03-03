from flask import Blueprint, render_template, request, redirect, url_for, flash, session, current_app, jsonify
from app.auth.services import AuthService
from app.utils.errors import UnauthorizedError, BadRequestError
from app.auth.decorators import get_current_user_id

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    user_id = None
    try:
        user_id = get_current_user_id()
    except UnauthorizedError:
        pass # Not authenticated
    if user_id:
        return redirect(url_for('main.dashboard'))
    return render_template('index.html')

@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        try:
            token = AuthService.authenticate_user(username, password)
            session['jwt_token'] = token # Store token in session
            flash('Logged in successfully!', 'success')
            return redirect(url_for('main.dashboard'))
        except UnauthorizedError as e:
            flash(f'Login failed: {e.message}', 'danger')
        except Exception as e:
            current_app.logger.error(f"Error during login for user {username}: {e}", exc_info=True)
            flash('An unexpected error occurred during login.', 'danger')
    return render_template('login.html')

@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        try:
            AuthService.register_user(username, email, password)
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('main.login'))
        except BadRequestError as e:
            flash(f'Registration failed: {e.message}', 'danger')
        except Exception as e:
            current_app.logger.error(f"Error during registration for user {username}: {e}", exc_info=True)
            flash('An unexpected error occurred during registration.', 'danger')
    return render_template('register.html')

@bp.route('/logout')
def logout():
    session.pop('jwt_token', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('main.index'))

@bp.route('/dashboard')
def dashboard():
    # This route will verify token on client side, or can be protected directly if needed
    # For simplicity, we just check if token exists in session for rendering template
    if 'jwt_token' not in session:
        flash('You need to log in to access the dashboard.', 'warning')
        return redirect(url_for('main.login'))
    return render_template('dashboard.html', token=session['jwt_token'])

# API proxies for dashboard (conceptual, a real frontend would call API directly)
@bp.route('/proxy/scrapers', methods=['GET', 'POST'])
@bp.route('/proxy/scrapers/<int:config_id>', methods=['GET', 'PUT', 'DELETE'])
@bp.route('/proxy/jobs', methods=['GET', 'POST'])
@bp.route('/proxy/jobs/<int:job_id>', methods=['GET', 'DELETE'])
@bp.route('/proxy/jobs/<int:job_id>/cancel', methods=['POST'])
@bp.route('/proxy/jobs/<int:job_id>/results', methods=['GET'])
def api_proxy(config_id=None, job_id=None):
    """
    A conceptual proxy for the dashboard to interact with the API.
    In a real-world scenario with a separate JS frontend, this would not be needed.
    The JS frontend would directly call the API endpoints with the JWT token.
    This demonstrates how a Flask templated frontend could still interact with the API.
    """
    if 'jwt_token' not in session:
        return jsonify({"message": "Unauthorized"}), 401

    # Reconstruct the API URL based on the request path
    api_path = request.path.replace('/proxy', '/api')
    api_url = url_for('api.index', _external=True) + api_path.split('/api')[1]

    headers = {'Authorization': f"Bearer {session['jwt_token']}"}
    if request.is_json:
        json_data = request.get_json()
    else:
        json_data = None

    import requests # Using requests here for proxying
    try:
        if request.method == 'GET':
            response = requests.get(api_url, headers=headers, params=request.args)
        elif request.method == 'POST':
            response = requests.post(api_url, headers=headers, json=json_data)
        elif request.method == 'PUT':
            response = requests.put(api_url, headers=headers, json=json_data)
        elif request.method == 'DELETE':
            response = requests.delete(api_url, headers=headers)
        else:
            return jsonify({"message": "Method not allowed"}), 405

        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Proxy error for {api_url}: {e}", exc_info=True)
        return jsonify({"message": "Proxy failed to reach API", "error": str(e)}), 500
```