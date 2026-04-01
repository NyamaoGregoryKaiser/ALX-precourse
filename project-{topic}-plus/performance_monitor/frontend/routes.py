```python
from flask import Blueprint, render_template, redirect, url_for, request, flash, session, current_app
import requests
import json
from datetime import datetime, timedelta

# This is a simplified frontend that directly interacts with the API
# In a real-world scenario, you might have a dedicated frontend application
# using a library like React/Vue.

frontend_bp = Blueprint('frontend', __name__, template_folder='templates', static_folder='static')

API_BASE_URL = "/api" # Use relative path since frontend and backend are on same server/port

def get_auth_headers():
    token = session.get('access_token')
    if token:
        return {'Authorization': f'Bearer {token}'}
    return {}

def make_api_request(method, path, json_data=None, params=None):
    headers = get_auth_headers()
    url = f"{API_BASE_URL}{path}"
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, params=params)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=json_data)
        elif method == 'PUT':
            response = requests.put(url, headers=headers, json=json_data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        return response.json(), None
    except requests.exceptions.HTTPError as e:
        error_msg = e.response.json().get('message', 'An API error occurred.') if e.response.text else str(e)
        current_app.logger.error(f"API Error {e.response.status_code} on {method} {path}: {error_msg}")
        return None, error_msg
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Network or request error on {method} {path}: {e}")
        return None, "Network or unexpected error connecting to API."
    except json.JSONDecodeError:
        error_msg = "API response was not valid JSON."
        current_app.logger.error(f"JSON Decode Error on {method} {path}: {response.text}")
        return None, error_msg


@frontend_bp.route('/')
def index():
    if 'access_token' not in session:
        return redirect(url_for('frontend.login'))
    
    dashboard_data, error = make_api_request('GET', '/metrics/dashboard-overview')
    if error:
        flash(f'Error fetching dashboard data: {error}', 'danger')
        dashboard_data = {
            'total_services': 0, 'active_services': 0, 'total_endpoints': 0, 
            'active_monitored_endpoints': 0, 'total_endpoints_polled_in_window': 0,
            'healthy_endpoints_in_window': 0, 'unhealthy_endpoints_in_window': 0,
            'overall_health_percentage': 0, 'recent_unhealthy_events': []
        }
    
    return render_template('index.html', dashboard_data=dashboard_data)

@frontend_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        data = {'username': username, 'password': password}
        response_data, error = make_api_request('POST', '/auth/login', json_data=data)

        if error:
            flash(f'Login failed: {error}', 'danger')
        else:
            session['access_token'] = response_data['access_token']
            session['refresh_token'] = response_data['refresh_token']
            flash('Login successful!', 'success')
            return redirect(url_for('frontend.index'))
    
    return render_template('login.html')

@frontend_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        data = {'username': username, 'email': email, 'password': password}
        response_data, error = make_api_request('POST', '/auth/register', json_data=data)

        if error:
            flash(f'Registration failed: {error}', 'danger')
        else:
            flash('Registration successful! Please log in.', 'success')
            # If registration also returns tokens, you could log them in automatically
            if 'access_token' in response_data:
                session['access_token'] = response_data['access_token']
                session['refresh_token'] = response_data['refresh_token']
                flash('Registered and logged in successfully!', 'success')
                return redirect(url_for('frontend.index'))
            return redirect(url_for('frontend.login'))
    return render_template('register.html')


@frontend_bp.route('/logout')
def logout():
    _, error = make_api_request('POST', '/auth/logout')
    if error:
        flash(f'Logout failed: {error}', 'danger')
    else:
        flash('You have been logged out.', 'info')
    
    session.pop('access_token', None)
    session.pop('refresh_token', None)
    return redirect(url_for('frontend.login'))


@frontend_bp.route('/services')
def services_list():
    if 'access_token' not in session:
        return redirect(url_for('frontend.login'))
    
    services, error = make_api_request('GET', '/services/')
    if error:
        flash(f'Error fetching services: {error}', 'danger')
        services = []
    
    return render_template('services.html', services=services)

@frontend_bp.route('/services/<int:service_id>')
def service_detail(service_id):
    if 'access_token' not in session:
        return redirect(url_for('frontend.login'))
    
    service, error = make_api_request('GET', f'/services/{service_id}')
    if error:
        flash(f'Error fetching service: {error}', 'danger')
        return redirect(url_for('frontend.services_list'))
    
    endpoints, error = make_api_request('GET', f'/endpoints/service/{service_id}')
    if error:
        flash(f'Error fetching endpoints: {error}', 'danger')
        endpoints = []

    health_overview, error = make_api_request('GET', f'/metrics/service/{service_id}/health-overview')
    if error:
        flash(f'Error fetching service health: {error}', 'danger')
        health_overview = []
    
    # Merge health status into endpoints
    endpoint_map = {ep['id']: ep for ep in endpoints}
    for health_item in health_overview:
        if health_item['endpoint_id'] in endpoint_map:
            endpoint_map[health_item['endpoint_id']].update({
                'latest_response_time_ms': health_item['latest_response_time_ms'],
                'latest_status_code': health_item['latest_status_code'],
                'latest_is_healthy': health_item['latest_is_healthy'],
                'latest_timestamp': health_item['latest_timestamp'],
                'latest_error_message': health_item['latest_error_message']
            })
    
    # Sort endpoints by health status (unhealthy first)
    sorted_endpoints = sorted(endpoints, key=lambda x: (not x.get('latest_is_healthy', True), x['path']))

    return render_template('service_detail.html', service=service, endpoints=sorted_endpoints)

@frontend_bp.route('/endpoints/<int:endpoint_id>')
def endpoint_detail(endpoint_id):
    if 'access_token' not in session:
        return redirect(url_for('frontend.login'))
    
    endpoint, error = make_api_request('GET', f'/endpoints/{endpoint_id}')
    if error:
        flash(f'Error fetching endpoint: {error}', 'danger')
        return redirect(url_for('frontend.services_list'))
    
    # Fetch raw metrics for a limited time window, e.g., last 4 hours
    now = datetime.utcnow()
    four_hours_ago = now - timedelta(hours=4)
    raw_metrics, error = make_api_request('GET', f'/metrics/endpoint/{endpoint_id}/raw', 
                                         params={'start_time': four_hours_ago.isoformat() + 'Z', 'limit': 200})
    if error:
        flash(f'Error fetching raw metrics: {error}', 'danger')
        raw_metrics = []

    # Fetch aggregated metrics for a longer period, e.g., last 24 hours, grouped by 15 mins
    twenty_four_hours_ago = now - timedelta(hours=24)
    aggregated_metrics, error = make_api_request('GET', f'/metrics/endpoint/{endpoint_id}/aggregated',
                                                 params={'time_window_minutes': 24 * 60, 'group_by_interval_minutes': 15})
    if error:
        flash(f'Error fetching aggregated metrics: {error}', 'danger')
        aggregated_metrics = []

    # Prepare data for Chart.js
    chart_data = {
        'labels': [m['time_bucket'] for m in aggregated_metrics],
        'avg_response_times': [m['avg_response_time_ms'] for m in aggregated_metrics],
        'health_percentages': [m['health_percentage'] for m in aggregated_metrics]
    }

    return render_template('endpoint_detail.html', endpoint=endpoint, raw_metrics=raw_metrics, chart_data=chart_data)

```