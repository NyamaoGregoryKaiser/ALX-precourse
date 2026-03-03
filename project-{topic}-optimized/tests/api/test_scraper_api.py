import pytest
from app import db
from app.models.scraper_config import ScraperConfig
from app.schemas.scraper import ScraperConfigCreate, ScraperConfigUpdate, ScraperConfigResponse
from app.utils.errors import NotFoundError, BadRequestError

def test_create_scraper_success(authenticated_client, auth_tokens, app):
    user_id = auth_tokens['user_id']
    payload = ScraperConfigCreate(
        name='API Test Scraper',
        start_url='http://api.example.com',
        css_selectors={'item': '.api-item'}
    ).model_dump()

    response = authenticated_client.post('/api/scrapers', json=payload)
    assert response.status_code == 201
    config_data = ScraperConfigResponse(**response.json)
    assert config_data.name == 'API Test Scraper'
    assert config_data.user_id == user_id
    with app.app_context():
        config = ScraperConfig.get_by_id(config_data.id, user_id)
        assert config is not None

def test_create_scraper_unauthenticated(client):
    payload = ScraperConfigCreate(
        name='Unauthorized Scraper',
        start_url='http://unauth.example.com',
        css_selectors={'item': '.unauth-item'}
    ).model_dump()
    response = client.post('/api/scrapers', json=payload)
    assert response.status_code == 401
    assert 'Authentication required' in response.json['message']

def test_create_scraper_duplicate_name(authenticated_client, auth_tokens, app, test_scraper_config):
    # test_scraper_config belongs to test_user which is what authenticated_client uses
    payload = ScraperConfigCreate(
        name=test_scraper_config.name, # Use existing name for the same user
        start_url='http://api.example.com',
        css_selectors={'item': '.api-item'}
    ).model_dump()
    response = authenticated_client.post('/api/scrapers', json=payload)
    assert response.status_code == 400
    assert 'already exists for this user' in response.json['message']

def test_get_all_scrapers_success(authenticated_client, auth_tokens, app, test_scraper_config):
    # test_scraper_config belongs to test_user (auth_tokens['user_id'])
    response = authenticated_client.get('/api/scrapers')
    assert response.status_code == 200
    scrapers = [ScraperConfigResponse(**s) for s in response.json]
    assert len(scrapers) == 1
    assert scrapers[0].id == test_scraper_config.id

def test_get_scraper_by_id_success(authenticated_client, auth_tokens, app, test_scraper_config):
    response = authenticated_client.get(f'/api/scrapers/{test_scraper_config.id}')
    assert response.status_code == 200
    config_data = ScraperConfigResponse(**response.json)
    assert config_data.id == test_scraper_config.id
    assert config_data.name == test_scraper_config.name

def test_get_scraper_by_id_not_found_or_unauthorized(authenticated_client, auth_tokens, app):
    # Try to get a non-existent scraper or one not owned by the user
    response = authenticated_client.get('/api/scrapers/999')
    assert response.status_code == 404
    assert 'not found' in response.json['message']

def test_update_scraper_success(authenticated_client, auth_tokens, app, test_scraper_config):
    payload = ScraperConfigUpdate(
        name='Updated Scraper Name',
        is_active=False
    ).model_dump(exclude_unset=True) # Only send fields to update
    response = authenticated_client.put(f'/api/scrapers/{test_scraper_config.id}', json=payload)
    assert response.status_code == 200
    config_data = ScraperConfigResponse(**response.json)
    assert config_data.name == 'Updated Scraper Name'
    assert config_data.is_active is False
    with app.app_context():
        updated_config = ScraperConfig.query.get(test_scraper_config.id)
        assert updated_config.name == 'Updated Scraper Name'
        assert updated_config.is_active is False

def test_update_scraper_unauthorized_owner(client, auth_tokens, app, test_scraper_config):
    # User tries to update config not belonging to them.
    # We need a scraper config belonging to admin_user and test with user_token
    with app.app_context():
        admin_config = ScraperConfig(
            user_id=auth_tokens['admin_id'],
            name='Admin Scraper',
            start_url='http://admin.com',
            css_selectors={}
        )
        db.session.add(admin_config)
        db.session.commit()

    payload = ScraperConfigUpdate(name='Attempted Update').model_dump(exclude_unset=True)
    response = authenticated_client.put(f'/api/scrapers/{admin_config.id}', json=payload)
    assert response.status_code == 404 # NotFound because get_by_id filters by user_id
    assert 'not found' in response.json['message']

    with app.app_context():
        db.session.delete(admin_config)
        db.session.commit()

def test_delete_scraper_success(authenticated_client, auth_tokens, app, test_scraper_config):
    response = authenticated_client.delete(f'/api/scrapers/{test_scraper_config.id}')
    assert response.status_code == 204
    with app.app_context():
        config = ScraperConfig.query.get(test_scraper_config.id)
        assert config is None # Ensure it's deleted

def test_delete_scraper_not_found_or_unauthorized(authenticated_client, auth_tokens, app):
    response = authenticated_client.delete('/api/scrapers/999')
    assert response.status_code == 404
    assert 'not found' in response.json['message']
```