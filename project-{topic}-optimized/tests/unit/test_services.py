import pytest
from unittest.mock import patch, MagicMock
from app.services.scraper_service import ScraperConfigService
from app.services.job_service import ScrapingJobService
from app.services.result_service import ScrapingResultService
from app.auth.services import AuthService
from app.utils.errors import NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError
from app.models.user import User
from app.models.scraper_config import ScraperConfig
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraping_result import ScrapingResult
from datetime import datetime

# --- AuthService Tests ---
def test_register_user_success(app):
    with app.app_context():
        user = AuthService.register_user('newuser', 'new@example.com', 'password123')
        assert user.username == 'newuser'
        assert user.check_password('password123')
        assert User.get_by_username('newuser') is not None

def test_register_user_exists(app, test_user):
    with app.app_context():
        with pytest.raises(BadRequestError, match="Username 'test_u' already exists."):
            AuthService.register_user('test_u', 'another@example.com', 'password123')
        with pytest.raises(BadRequestError, match="Email 'test_u@example.com' already exists."):
            AuthService.register_user('another', 'test_u@example.com', 'password123')

def test_authenticate_user_success(app, test_user):
    with app.app_context():
        token = AuthService.authenticate_user(test_user.username, 'password')
        assert token is not None
        assert isinstance(token, str)

def test_authenticate_user_invalid_credentials(app, test_user):
    with app.app_context():
        with pytest.raises(UnauthorizedError, match="Invalid username or password."):
            AuthService.authenticate_user(test_user.username, 'wrong_password')
        with pytest.raises(UnauthorizedError, match="Invalid username or password."):
            AuthService.authenticate_user('nonexistent', 'password')

# --- ScraperConfigService Tests ---
def test_create_scraper_config_success(app, test_user):
    with app.app_context():
        config = ScraperConfigService.create_scraper_config(
            test_user.id, 'My New Scraper', 'http://example.com/new', {'item': '.new-item'}
        )
        assert config.name == 'My New Scraper'
        assert config.user_id == test_user.id
        assert ScraperConfig.get_by_id(config.id, test_user.id) is not None

def test_create_scraper_config_duplicate_name(app, test_scraper_config):
    with app.app_context():
        with pytest.raises(BadRequestError, match="Scraper config with name 'Test Scraper' already exists for this user."):
            ScraperConfigService.create_scraper_config(
                test_scraper_config.user_id, 'Test Scraper', 'http://example.com/dup', {'item': '.dup-item'}
            )

def test_get_all_scraper_configs(app, test_user, test_scraper_config):
    with app.app_context():
        configs = ScraperConfigService.get_all_scraper_configs(test_user.id)
        assert len(configs) == 1
        assert configs[0].id == test_scraper_config.id

def test_get_scraper_config_by_id_success(app, test_scraper_config):
    with app.app_context():
        config = ScraperConfigService.get_scraper_config_by_id(test_scraper_config.id, test_scraper_config.user_id)
        assert config.id == test_scraper_config.id

def test_get_scraper_config_by_id_not_found(app, test_user):
    with app.app_context():
        with pytest.raises(NotFoundError, match="Scraper config with ID 999 not found."):
            ScraperConfigService.get_scraper_config_by_id(999, test_user.id)

def test_get_scraper_config_by_id_unauthorized_user(app, test_scraper_config):
    with app.app_context():
        # Create another user
        another_user = User(username='another', email='another@example.com')
        another_user.set_password('pass')
        another_user.save()
        with pytest.raises(NotFoundError, match="Scraper config with ID .* not found."): # It's NotFound because get_by_id filters by user_id
            ScraperConfigService.get_scraper_config_by_id(test_scraper_config.id, another_user.id)
        another_user.delete()


def test_update_scraper_config_success(app, test_scraper_config):
    with app.app_context():
        updated_config = ScraperConfigService.update_scraper_config(
            test_scraper_config.id, test_scraper_config.user_id,
            name='Updated Name', is_active=False
        )
        assert updated_config.name == 'Updated Name'
        assert updated_config.is_active is False

def test_update_scraper_config_not_found(app, test_user):
    with app.app_context():
        with pytest.raises(NotFoundError):
            ScraperConfigService.update_scraper_config(999, test_user.id, name='Non Existent')

def test_delete_scraper_config_success(app, test_scraper_config):
    with app.app_context():
        ScraperConfigService.delete_scraper_config(test_scraper_config.id, test_scraper_config.user_id)
        with pytest.raises(NotFoundError):
            ScraperConfigService.get_scraper_config_by_id(test_scraper_config.id, test_scraper_config.user_id)

# --- ScrapingJobService Tests ---
@patch('app.tasks.scraping_tasks.run_scraping_job.apply_async')
def test_create_scraping_job_success(mock_apply_async, app, test_scraper_config):
    with app.app_context():
        mock_apply_async.return_value = MagicMock(id='test_task_id')
        job = ScrapingJobService.create_scraping_job(test_scraper_config.user_id, test_scraper_config.id)
        assert job.scraper_config_id == test_scraper_config.id
        assert job.status == JobStatus.PENDING
        assert job.celery_task_id == 'test_task_id'
        mock_apply_async.assert_called_once_with(args=[job.id])

def test_create_scraping_job_config_not_found(app, test_user):
    with app.app_context():
        with pytest.raises(NotFoundError, match="Scraper config with ID 999 not found or not owned by user."):
            ScrapingJobService.create_scraping_job(test_user.id, 999)

def test_create_scraping_job_config_inactive(app, test_user):
    with app.app_context():
        inactive_config = ScraperConfig(
            user_id=test_user.id,
            name='Inactive Scraper',
            start_url='http://inactive.com',
            css_selectors={},
            is_active=False
        )
        inactive_config.save()
        with pytest.raises(BadRequestError, match="Scraper config with ID .* is not active and cannot be run."):
            ScrapingJobService.create_scraping_job(test_user.id, inactive_config.id)
        inactive_config.delete()

def test_get_all_scraping_jobs(app, test_scraping_job):
    with app.app_context():
        jobs = ScrapingJobService.get_all_scraping_jobs(test_scraping_job.user_id)
        assert len(jobs) == 1
        assert jobs[0].id == test_scraping_job.id

        # Test filtering by status
        test_scraping_job.update(status=JobStatus.COMPLETED)
        completed_jobs = ScrapingJobService.get_all_scraping_jobs(test_scraping_job.user_id, status='COMPLETED')
        assert len(completed_jobs) == 1
        assert completed_jobs[0].id == test_scraping_job.id
        pending_jobs = ScrapingJobService.get_all_scraping_jobs(test_scraping_job.user_id, status='PENDING')
        assert len(pending_jobs) == 0


def test_get_scraping_job_by_id_success(app, test_scraping_job):
    with app.app_context():
        job = ScrapingJobService.get_scraping_job_by_id(test_scraping_job.id, test_scraping_job.user_id)
        assert job.id == test_scraping_job.id

def test_get_scraping_job_by_id_not_found(app, test_user):
    with app.app_context():
        with pytest.raises(NotFoundError):
            ScrapingJobService.get_scraping_job_by_id(999, test_user.id)

@patch('app.celery_app.control.revoke')
def test_cancel_scraping_job_success(mock_revoke, app, test_scraping_job):
    with app.app_context():
        test_scraping_job.celery_task_id = 'mock_task_id'
        test_scraping_job.save() # Persist task_id
        cancelled_job = ScrapingJobService.cancel_scraping_job(test_scraping_job.id, test_scraping_job.user_id)
        assert cancelled_job.status == JobStatus.CANCELLED
        assert cancelled_job.finished_at is not None
        mock_revoke.assert_called_once_with('mock_task_id', terminate=True, signal='SIGTERM')

def test_cancel_scraping_job_invalid_status(app, test_scraping_job):
    with app.app_context():
        test_scraping_job.update(status=JobStatus.COMPLETED)
        with pytest.raises(BadRequestError, match="Job .* is in status COMPLETED and cannot be cancelled."):
            ScrapingJobService.cancel_scraping_job(test_scraping_job.id, test_scraping_job.user_id)

def test_delete_scraping_job_success(app, test_scraping_job):
    with app.app_context():
        test_scraping_job.update(status=JobStatus.COMPLETED) # Must be non-running
        ScrapingJobService.delete_scraping_job(test_scraping_job.id, test_scraping_job.user_id)
        with pytest.raises(NotFoundError):
            ScrapingJobService.get_scraping_job_by_id(test_scraping_job.id, test_scraping_job.user_id)

def test_delete_scraping_job_running_status(app, test_scraping_job):
    with app.app_context():
        test_scraping_job.update(status=JobStatus.RUNNING)
        with pytest.raises(BadRequestError, match="Job .* is currently RUNNING. Please cancel it first before deleting."):
            ScrapingJobService.delete_scraping_job(test_scraping_job.id, test_scraping_job.user_id)


# --- ScrapingResultService Tests ---
def test_get_results_for_job_success(app, test_scraping_job, test_scraping_result):
    with app.app_context():
        results = ScrapingResultService.get_results_for_job(test_scraping_job.id, test_scraping_job.user_id)
        assert len(results) == 1
        assert results[0].id == test_scraping_result.id

def test_get_results_for_job_not_found(app, test_user):
    with app.app_context():
        with pytest.raises(NotFoundError, match="Scraping job with ID 999 not found or not owned by user."):
            ScrapingResultService.get_results_for_job(999, test_user.id)

def test_get_result_by_id_success(app, test_scraping_job, test_scraping_result):
    with app.app_context():
        result = ScrapingResultService.get_result_by_id(test_scraping_result.id, test_scraping_job.user_id)
        assert result.id == test_scraping_result.id

def test_get_result_by_id_not_found(app, test_user):
    with app.app_context():
        with pytest.raises(NotFoundError, match="Scraping result with ID 999 not found."):
            ScrapingResultService.get_result_by_id(999, test_user.id)

def test_get_result_by_id_forbidden(app, test_scraping_result):
    with app.app_context():
        # Create another user
        another_user = User(username='another_user_for_results', email='another_result@example.com')
        another_user.set_password('pass')
        another_user.save()
        with pytest.raises(ForbiddenError, match="Access to result .* is forbidden."):
            ScrapingResultService.get_result_by_id(test_scraping_result.id, another_user.id)
        another_user.delete()

```