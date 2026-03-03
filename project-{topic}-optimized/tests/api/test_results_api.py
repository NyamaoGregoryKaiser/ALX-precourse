import pytest
from app import db
from app.models.scraper_config import ScraperConfig
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraping_result import ScrapingResult
from app.schemas.result import ScrapingResultResponse
from app.utils.errors import NotFoundError, ForbiddenError

def test_get_job_results_success(authenticated_client, auth_tokens, app, test_scraping_job, test_scraping_result):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.status = JobStatus.COMPLETED
        test_scraping_job.save()
        test_scraping_result.job_id = test_scraping_job.id
        test_scraping_result.save()


    response = authenticated_client.get(f'/api/jobs/{test_scraping_job.id}/results')
    assert response.status_code == 200
    results = [ScrapingResultResponse(**r) for r in response.json]
    assert len(results) == 1
    assert results[0].id == test_scraping_result.id
    assert results[0].data == test_scraping_result.data

def test_get_job_results_job_not_found(authenticated_client, auth_tokens):
    response = authenticated_client.get('/api/jobs/999/results')
    assert response.status_code == 404
    assert 'not found or not owned by user' in response.json['message']

def test_get_job_results_unauthorized_user(client, auth_tokens, app, test_scraping_job, test_scraping_result):
    # Create another user and try to access someone else's job results
    with app.app_context():
        other_user = client.post(
            '/api/auth/register',
            json={'username': 'other_user', 'email': 'other@example.com', 'password': 'password'}
        ).json
        other_user_id = User.get_by_username('other_user').id
        other_user_token = client.post(
            '/api/auth/login',
            json={'username': 'other_user', 'password': 'password'}
        ).json['access_token']

        # Ensure the job belongs to test_user, not other_user
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.status = JobStatus.COMPLETED
        test_scraping_job.save()
        test_scraping_result.job_id = test_scraping_job.id
        test_scraping_result.save()

    # Client with other_user's token tries to access test_user's job results
    other_client = client
    other_client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {other_user_token}'

    response = other_client.get(f'/api/jobs/{test_scraping_job.id}/results')
    assert response.status_code == 404
    assert 'not found or not owned by user' in response.json['message']

def test_get_result_by_id_success(authenticated_client, auth_tokens, app, test_scraping_job, test_scraping_result):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.save()
        test_scraping_result.job_id = test_scraping_job.id
        test_scraping_result.save()

    response = authenticated_client.get(f'/api/results/{test_scraping_result.id}')
    assert response.status_code == 200
    result_data = ScrapingResultResponse(**response.json)
    assert result_data.id == test_scraping_result.id
    assert result_data.data == test_scraping_result.data

def test_get_result_by_id_not_found(authenticated_client):
    response = authenticated_client.get('/api/results/999')
    assert response.status_code == 404
    assert 'not found' in response.json['message']

def test_get_result_by_id_forbidden_access(client, auth_tokens, app, test_scraping_job, test_scraping_result):
    with app.app_context():
        # Ensure job belongs to test_user
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.save()
        test_scraping_result.job_id = test_scraping_job.id
        test_scraping_result.save()

        # Create an admin user who shouldn't implicitly have access to another user's private data
        admin_user = User(username='admin_results', email='admin_results@example.com', is_admin=True)
        admin_user.set_password('adminpass')
        db.session.add(admin_user)
        db.session.commit()
        admin_token = client.post(
            '/api/auth/login',
            json={'username': 'admin_results', 'password': 'adminpass'}
        ).json['access_token']

    admin_client = client
    admin_client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {admin_token}'

    response = admin_client.get(f'/api/results/{test_scraping_result.id}')
    assert response.status_code == 403 # Forbidden, because the job is not owned by admin
    assert 'Access to result' in response.json['message']
```