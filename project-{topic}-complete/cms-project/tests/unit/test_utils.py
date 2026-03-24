import pytest
from app.utils import slugify_content_title, generate_random_string, has_roles, cached
from flask import Flask, jsonify, request
from app.extensions import jwt, cache, limiter
from flask_jwt_extended import create_access_token, JWTManager
from datetime import timedelta
import time

def test_slugify_content_title():
    assert slugify_content_title("My Awesome Blog Post") == "my-awesome-blog-post"
    assert slugify_content_title("Another Post! With Punctuation?") == "another-post-with-punctuation"
    assert slugify_content_title("  leading and trailing spaces  ") == "leading-and-trailing-spaces"
    assert slugify_content_title("한국어 제목") == "hangug-eo-jeomog" # transliterated
    assert slugify_content_title("123 A Title") == "123-a-title"
    assert slugify_content_title("") == ""

def test_generate_random_string():
    s1 = generate_random_string(10)
    s2 = generate_random_string(10)
    assert len(s1) == 10
    assert len(s2) == 10
    assert s1 != s2 # Highly unlikely to be the same

    s3 = generate_random_string(0)
    assert len(s3) == 0

def test_has_roles_decorator(flask_app, sample_users, auth_tokens):
    with flask_app.app_context():
        # Setup a dummy blueprint for testing decorators
        bp = Flask(__name__)
        bp.config.from_object('config.TestingConfig')
        jwt.init_app(bp)

        @bp.route('/admin-only')
        @has_roles(['admin'])
        def admin_only_route():
            return jsonify({"message": "Admin access granted"}), 200

        @bp.route('/editor-or-admin')
        @has_roles(['editor', 'admin'])
        def editor_or_admin_route():
            return jsonify({"message": "Editor or Admin access granted"}), 200

        # Test with admin token
        headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
        with bp.test_client() as client:
            resp = client.get('/admin-only', headers=headers)
            assert resp.status_code == 200
            assert resp.json == {"message": "Admin access granted"}

            resp = client.get('/editor-or-admin', headers=headers)
            assert resp.status_code == 200
            assert resp.json == {"message": "Editor or Admin access granted"}

        # Test with editor token
        headers = {'Authorization': f'Bearer {auth_tokens["editor_token"]}'}
        with bp.test_client() as client:
            resp = client.get('/admin-only', headers=headers)
            assert resp.status_code == 403 # Forbidden
            assert "Insufficient permissions" in resp.json['message']

            resp = client.get('/editor-or-admin', headers=headers)
            assert resp.status_code == 200
            assert resp.json == {"message": "Editor or Admin access granted"}

        # Test with author token
        headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
        with bp.test_client() as client:
            resp = client.get('/admin-only', headers=headers)
            assert resp.status_code == 403

            resp = client.get('/editor-or-admin', headers=headers)
            assert resp.status_code == 403

        # Test without token
        with bp.test_client() as client:
            resp = client.get('/admin-only')
            assert resp.status_code == 401 # Unauthorized
            assert "Authentication required" in resp.json['message']

def test_cached_decorator(flask_app):
    with flask_app.app_context():
        # Ensure cache is configured for testing
        cache.init_app(flask_app) # Re-init cache to ensure it's null or simple

        call_count = {'value': 0}

        @flask_app.route('/test-cache')
        @cached(timeout=1)
        def test_cache_route():
            call_count['value'] += 1
            return jsonify({"count": call_count['value']})

        with flask_app.test_client() as client:
            # First call, should execute function
            resp = client.get('/test-cache')
            assert resp.status_code == 200
            assert resp.json['count'] == 1

            # Second call within cache timeout, should use cache
            resp = client.get('/test-cache')
            assert resp.status_code == 200
            assert resp.json['count'] == 1 # Still 1

            # Wait for cache to expire
            time.sleep(1.1)

            # Third call after timeout, should execute function again
            resp = client.get('/test-cache')
            assert resp.status_code == 200
            assert resp.json['count'] == 2 # Now 2

            # Test different query string, should be different cache key
            resp = client.get('/test-cache?param=1')
            assert resp.status_code == 200
            assert resp.json['count'] == 3

            resp = client.get('/test-cache?param=1')
            assert resp.status_code == 200
            assert resp.json['count'] == 3

            resp = client.get('/test-cache') # Original route
            assert resp.status_code == 200
            assert resp.json['count'] == 2 # Still cached from before query string
```