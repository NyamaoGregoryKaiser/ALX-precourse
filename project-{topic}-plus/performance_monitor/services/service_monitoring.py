```python
import requests
import time
import json
from datetime import datetime

from flask import current_app
from sqlalchemy.orm import Session
from performance_monitor.extensions import db
from performance_monitor.models import Service, Endpoint, Metric

class ServiceMonitoringService:
    """
    Business logic for managing services and endpoints, and for
    performing the actual monitoring (polling) of endpoints.
    """

    @staticmethod
    def create_service(name, base_url, owner_id, description=None):
        """Creates a new service."""
        if Service.query.filter_by(name=name).first():
            return None, "Service name already exists."

        service = Service(name=name, base_url=base_url, owner_id=owner_id, description=description)
        db.session.add(service)
        try:
            db.session.commit()
            current_app.logger.info(f"Service '{name}' created by user {owner_id}.")
            return service, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating service '{name}': {e}")
            return None, "Database error during service creation."

    @staticmethod
    def get_service(service_id):
        """Retrieves a service by ID."""
        return Service.query.get(service_id)

    @staticmethod
    def get_all_services(owner_id=None):
        """Retrieves all services, optionally filtered by owner."""
        query = Service.query
        if owner_id:
            query = query.filter_by(owner_id=owner_id)
        return query.all()

    @staticmethod
    def update_service(service_id, data):
        """Updates an existing service."""
        service = Service.query.get(service_id)
        if not service:
            return None, "Service not found."

        if 'name' in data and data['name'] != service.name:
            if Service.query.filter_by(name=data['name']).first():
                return None, "Service name already exists."
            service.name = data['name']
        
        service.base_url = data.get('base_url', service.base_url)
        service.description = data.get('description', service.description)
        service.is_active = data.get('is_active', service.is_active)

        try:
            db.session.commit()
            current_app.logger.info(f"Service '{service.name}' (ID: {service_id}) updated.")
            # If service becomes inactive, remove its endpoints from scheduler
            if not service.is_active:
                from performance_monitor.tasks import remove_endpoint_from_scheduler
                for endpoint in service.endpoints:
                    remove_endpoint_from_scheduler(endpoint.id)
            return service, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating service '{service.name}' (ID: {service_id}): {e}")
            return None, "Database error during service update."

    @staticmethod
    def delete_service(service_id):
        """Deletes a service by ID."""
        service = Service.query.get(service_id)
        if not service:
            return False, "Service not found."

        # Remove associated endpoints from scheduler before deleting
        from performance_monitor.tasks import remove_endpoint_from_scheduler
        for endpoint in service.endpoints:
            remove_endpoint_from_scheduler(endpoint.id)

        db.session.delete(service)
        try:
            db.session.commit()
            current_app.logger.info(f"Service '{service.name}' (ID: {service_id}) deleted.")
            return True, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting service '{service.name}' (ID: {service_id}): {e}")
            return False, "Database error during service deletion."

    @staticmethod
    def create_endpoint(service_id, path, method='GET', expected_status=200, polling_interval_seconds=None):
        """Creates a new endpoint for a service."""
        service = ServiceMonitoringService.get_service(service_id)
        if not service:
            return None, "Service not found."

        if Endpoint.query.filter_by(service_id=service_id, path=path, method=method).first():
            return None, "Endpoint with this path and method already exists for this service."

        if polling_interval_seconds is None:
            polling_interval_seconds = current_app.config['DEFAULT_POLLING_INTERVAL_SECONDS']

        endpoint = Endpoint(
            service_id=service_id,
            path=path,
            method=method,
            expected_status=expected_status,
            polling_interval_seconds=polling_interval_seconds
        )
        db.session.add(endpoint)
        try:
            db.session.commit()
            current_app.logger.info(f"Endpoint '{path}' ({method}) created for service {service_id}.")
            from performance_monitor.tasks import add_endpoint_to_scheduler
            add_endpoint_to_scheduler(current_app._get_current_object(), endpoint) # Pass app instance explicitly
            return endpoint, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating endpoint '{path}' for service {service_id}: {e}")
            return None, "Database error during endpoint creation."

    @staticmethod
    def get_endpoint(endpoint_id):
        """Retrieves an endpoint by ID."""
        return Endpoint.query.get(endpoint_id)

    @staticmethod
    def get_service_endpoints(service_id):
        """Retrieves all endpoints for a given service."""
        return Endpoint.query.filter_by(service_id=service_id).all()

    @staticmethod
    def update_endpoint(endpoint_id, data):
        """Updates an existing endpoint."""
        endpoint = Endpoint.query.get(endpoint_id)
        if not endpoint:
            return None, "Endpoint not found."

        original_path = endpoint.path
        original_method = endpoint.method
        original_interval = endpoint.polling_interval_seconds
        original_is_active = endpoint.is_active

        if 'path' in data and data['path'] != endpoint.path:
            if Endpoint.query.filter_by(service_id=endpoint.service_id, path=data['path'], method=endpoint.method).first():
                return None, "Endpoint with this path and method already exists for this service."
            endpoint.path = data['path']

        if 'method' in data and data['method'] != endpoint.method:
             if Endpoint.query.filter_by(service_id=endpoint.service_id, path=endpoint.path, method=data['method']).first():
                return None, "Endpoint with this path and new method already exists for this service."
             endpoint.method = data['method']
        
        endpoint.expected_status = data.get('expected_status', endpoint.expected_status)
        endpoint.polling_interval_seconds = data.get('polling_interval_seconds', endpoint.polling_interval_seconds)
        endpoint.is_active = data.get('is_active', endpoint.is_active)

        try:
            db.session.commit()
            current_app.logger.info(f"Endpoint (ID: {endpoint_id}) updated.")
            
            # Re-add/update job in scheduler if relevant parameters changed
            if (original_path != endpoint.path or 
                original_method != endpoint.method or
                original_interval != endpoint.polling_interval_seconds or
                original_is_active != endpoint.is_active):
                
                from performance_monitor.tasks import add_endpoint_to_scheduler, remove_endpoint_from_scheduler
                if endpoint.is_active and endpoint.service.is_active: # Only schedule if endpoint AND its service are active
                    add_endpoint_to_scheduler(current_app._get_current_object(), endpoint)
                else: # If endpoint or service becomes inactive, remove from scheduler
                    remove_endpoint_from_scheduler(endpoint.id)

            return endpoint, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating endpoint (ID: {endpoint_id}): {e}")
            return None, "Database error during endpoint update."

    @staticmethod
    def delete_endpoint(endpoint_id):
        """Deletes an endpoint by ID."""
        endpoint = Endpoint.query.get(endpoint_id)
        if not endpoint:
            return False, "Endpoint not found."
        
        from performance_monitor.tasks import remove_endpoint_from_scheduler
        remove_endpoint_from_scheduler(endpoint_id)

        db.session.delete(endpoint)
        try:
            db.session.commit()
            current_app.logger.info(f"Endpoint (ID: {endpoint_id}) deleted.")
            return True, None
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting endpoint (ID: {endpoint_id}): {e}")
            return False, "Database error during endpoint deletion."

# This function is designed to be called by APScheduler
def poll_endpoint_and_save_metric(app_instance, endpoint_id):
    """
    Polls a specific endpoint and saves the generated metric.
    This function runs within an app context managed by APScheduler.
    """
    with app_instance.app_context():
        current_app.logger.debug(f"Polling endpoint {endpoint_id}...")
        session = db.session
        endpoint = session.query(Endpoint).options(db.joinedload(Endpoint.service)).get(endpoint_id)

        if not endpoint or not endpoint.is_active or not endpoint.service.is_active:
            if not endpoint:
                current_app.logger.warning(f"Scheduler tried to poll non-existent endpoint {endpoint_id}. Removing job.")
                from performance_monitor.tasks import remove_endpoint_from_scheduler
                remove_endpoint_from_scheduler(endpoint_id)
            else:
                current_app.logger.info(f"Skipping poll for inactive endpoint {endpoint_id} or inactive service {endpoint.service_id}.")
            return

        full_url = endpoint.get_full_url()
        start_time = time.perf_counter()
        
        response_time_ms = 0
        status_code = 0
        response_size_bytes = 0
        is_healthy = False
        error_message = None

        try:
            response = requests.request(endpoint.method, full_url, timeout=10) # 10-second timeout
            end_time = time.perf_counter()
            response_time_ms = int((end_time - start_time) * 1000)
            status_code = response.status_code
            response_size_bytes = len(response.content)
            is_healthy = (status_code == endpoint.expected_status)

            if not is_healthy:
                error_message = f"Unexpected status code: {status_code} (Expected: {endpoint.expected_status})"
                current_app.logger.warning(f"Endpoint {endpoint.id} - {full_url} returned unexpected status {status_code}.")
            else:
                current_app.logger.debug(f"Endpoint {endpoint.id} - {full_url} polled successfully: {status_code} in {response_time_ms}ms.")

        except requests.exceptions.Timeout:
            end_time = time.perf_counter()
            response_time_ms = int((end_time - start_time) * 1000)
            status_code = 408 # Request Timeout
            is_healthy = False
            error_message = "Request timed out."
            current_app.logger.error(f"Endpoint {endpoint.id} - {full_url} timed out after {response_time_ms}ms.")
        except requests.exceptions.ConnectionError as e:
            response_time_ms = int((time.perf_counter() - start_time) * 1000)
            status_code = 503 # Service Unavailable or similar
            is_healthy = False
            error_message = f"Connection error: {e}"
            current_app.logger.error(f"Endpoint {endpoint.id} - {full_url} connection error: {e}")
        except requests.exceptions.RequestException as e:
            response_time_ms = int((time.perf_counter() - start_time) * 1000)
            status_code = 500 # General request error
            is_healthy = False
            error_message = f"Request error: {e}"
            current_app.logger.error(f"Endpoint {endpoint.id} - {full_url} general request error: {e}")
        except Exception as e:
            response_time_ms = int((time.perf_counter() - start_time) * 1000)
            status_code = 500
            is_healthy = False
            error_message = f"An unexpected error occurred: {e}"
            current_app.logger.exception(f"Endpoint {endpoint.id} - {full_url} unhandled exception: {e}")

        # Create and save metric
        metric = Metric(
            endpoint_id=endpoint.id,
            response_time_ms=response_time_ms,
            status_code=status_code,
            response_size_bytes=response_size_bytes,
            timestamp=datetime.utcnow(),
            is_healthy=is_healthy,
            error_message=error_message
        )
        session.add(metric)
        
        # Update last_polled_at and last_status on the endpoint
        endpoint.last_polled_at = datetime.utcnow()
        endpoint.last_status = status_code

        try:
            session.commit()
            current_app.logger.debug(f"Metric saved for endpoint {endpoint.id}.")
        except Exception as e:
            session.rollback()
            current_app.logger.error(f"Error saving metric for endpoint {endpoint.id}: {e}")

```