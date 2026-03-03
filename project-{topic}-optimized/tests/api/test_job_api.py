import pytest
from app import db
from app.models.scraper_config import ScraperConfig
from app.models.scraping_job import ScrapingJob, JobStatus
from app.schemas.job import ScrapingJobCreate, ScrapingJobResponse
from app.utils.errors import NotFoundError, BadRequestError
from unittest.mock import patch, MagicMock

# Mock Celery task for testing job creation
@pytest.fixture(autouse=True)
def mock_celery_task():
    with patch('app.services.job_service.run_scraping_job.apply_async') as mock_apply_async:
        mock_apply_async.return_value = MagicMock(id='mock_celery_task_id')
        yield mock_apply_async

def test_create_job_success(authenticated_client, auth_tokens, app, test_scraper_config):
    # Ensure test_scraper_config belongs to the authenticated_client's user
    with app.app_context():
        test_scraper_config.user_id = auth_tokens['user_id']
        test_scraper_config.save()

    payload = ScrapingJobCreate(scraper_config_id=test_scraper_config.id).model_dump()
    response = authenticated_client.post('/api/jobs', json=payload)
    assert response.status_code == 201
    job_data = ScrapingJobResponse(**response.json)
    assert job_data.scraper_config_id == test_scraper_config.id
    assert job_data.user_id == auth_tokens['user_id']
    assert job_data.status == JobStatus.PENDING.value
    assert job_data.celery_task_id == 'mock_celery_task_id'

def test_create_job_config_not_found(authenticated_client, auth_tokens):
    payload = ScrapingJobCreate(scraper_config_id=999).model_dump()
    response = authenticated_client.post('/api/jobs', json=payload)
    assert response.status_code == 404
    assert 'not found' in response.json['message']

def test_create_job_config_inactive(authenticated_client, auth_tokens, app, test_scraper_config):
    with app.app_context():
        test_scraper_config.user_id = auth_tokens['user_id']
        test_scraper_config.is_active = False
        test_scraper_config.save()

    payload = ScrapingJobCreate(scraper_config_id=test_scraper_config.id).model_dump()
    response = authenticated_client.post('/api/jobs', json=payload)
    assert response.status_code == 400
    assert 'is not active and cannot be run' in response.json['message']

def test_get_all_jobs_success(authenticated_client, auth_tokens, app, test_scraping_job):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.save()

    response = authenticated_client.get('/api/jobs')
    assert response.status_code == 200
    jobs = [ScrapingJobResponse(**j) for j in response.json]
    assert len(jobs) == 1
    assert jobs[0].id == test_scraping_job.id

def test_get_all_jobs_filter_status(authenticated_client, auth_tokens, app, test_scraper_config):
    with app.app_context():
        test_scraper_config.user_id = auth_tokens['user_id']
        test_scraper_config.save()

        job1 = ScrapingJob(scraper_config_id=test_scraper_config.id, user_id=auth_tokens['user_id'], status=JobStatus.PENDING)
        job2 = ScrapingJob(scraper_config_id=test_scraper_config.id, user_id=auth_tokens['user_id'], status=JobStatus.COMPLETED)
        db.session.add_all([job1, job2])
        db.session.commit()

    response = authenticated_client.get('/api/jobs?status=PENDING')
    assert response.status_code == 200
    jobs = [ScrapingJobResponse(**j) for j in response.json]
    assert len(jobs) == 1
    assert jobs[0].status == JobStatus.PENDING.value

    response_completed = authenticated_client.get('/api/jobs?status=COMPLETED')
    assert response_completed.status_code == 200
    jobs_completed = [ScrapingJobResponse(**j) for j in response_completed.json]
    assert len(jobs_completed) == 1
    assert jobs_completed[0].status == JobStatus.COMPLETED.value

def test_get_job_by_id_success(authenticated_client, auth_tokens, app, test_scraping_job):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.save()

    response = authenticated_client.get(f'/api/jobs/{test_scraping_job.id}')
    assert response.status_code == 200
    job_data = ScrapingJobResponse(**response.json)
    assert job_data.id == test_scraping_job.id

def test_get_job_by_id_not_found_or_unauthorized(authenticated_client, auth_tokens):
    response = authenticated_client.get('/api/jobs/999')
    assert response.status_code == 404
    assert 'not found' in response.json['message']

@patch('app.celery_app.control.revoke')
def test_cancel_job_success(mock_revoke, authenticated_client, auth_tokens, app, test_scraping_job):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.status = JobStatus.RUNNING
        test_scraping_job.celery_task_id = 'mock_celery_task_id_to_revoke'
        test_scraping_job.save()

    response = authenticated_client.post(f'/api/jobs/{test_scraping_job.id}/cancel')
    assert response.status_code == 200
    job_data = ScrapingJobResponse(**response.json)
    assert job_data.status == JobStatus.CANCELLED.value
    mock_revoke.assert_called_once_with('mock_celery_task_id_to_revoke', terminate=True, signal='SIGTERM')

def test_cancel_job_invalid_status(authenticated_client, auth_tokens, app, test_scraping_job):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.status = JobStatus.COMPLETED # Cannot cancel completed job
        test_scraping_job.save()

    response = authenticated_client.post(f'/api/jobs/{test_scraping_job.id}/cancel')
    assert response.status_code == 400
    assert 'cannot be cancelled' in response.json['message']

def test_delete_job_success(authenticated_client, auth_tokens, app, test_scraping_job):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.status = JobStatus.COMPLETED # Must be non-running
        test_scraping_job.save()

    response = authenticated_client.delete(f'/api/jobs/{test_scraping_job.id}')
    assert response.status_code == 204
    with app.app_context():
        job = ScrapingJob.query.get(test_scraping_job.id)
        assert job is None

def test_delete_job_running_status(authenticated_client, auth_tokens, app, test_scraping_job):
    with app.app_context():
        test_scraping_job.user_id = auth_tokens['user_id']
        test_scraping_job.status = JobStatus.RUNNING
        test_scraping_job.save()

    response = authenticated_client.delete(f'/api/jobs/{test_scraping_job.id}')
    assert response.status_code == 400
    assert 'Please cancel it first before deleting' in response.json['message']
```