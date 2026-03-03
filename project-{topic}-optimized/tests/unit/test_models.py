import pytest
from datetime import datetime, timedelta
from app import db
from app.models.user import User
from app.models.scraper_config import ScraperConfig
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraping_result import ScrapingResult

def test_user_model(app):
    with app.app_context():
        user = User(username='test_user', email='test@example.com')
        user.set_password('password')
        db.session.add(user)
        db.session.commit()

        assert user.id is not None
        assert user.username == 'test_user'
        assert user.email == 'test@example.com'
        assert user.check_password('password')
        assert not user.check_password('wrong_password')
        assert user.created_at is not None
        assert user.updated_at is not None
        assert not user.is_admin

        retrieved_user = User.get_by_username('test_user')
        assert retrieved_user.id == user.id

        retrieved_user_by_email = User.get_by_email('test@example.com')
        assert retrieved_user_by_email.id == user.id

        user.update(username='updated_user')
        assert user.username == 'updated_user'
        assert user.updated_at > user.created_at

        user.delete()
        assert User.get_by_username('updated_user') is None

def test_scraper_config_model(app, test_user):
    with app.app_context():
        config = ScraperConfig(
            user_id=test_user.id,
            name='Test Scraper Config',
            start_url='http://test.com',
            css_selectors={'title': 'h1'}
        )
        db.session.add(config)
        db.session.commit()

        assert config.id is not None
        assert config.name == 'Test Scraper Config'
        assert config.start_url == 'http://test.com'
        assert config.css_selectors == {'title': 'h1'}
        assert config.user_id == test_user.id
        assert config.is_active is True

        configs = ScraperConfig.get_all(user_id=test_user.id)
        assert len(configs) == 1
        assert configs[0].id == config.id

        retrieved_config = ScraperConfig.get_by_id(config.id, user_id=test_user.id)
        assert retrieved_config.id == config.id

        config.update(name='Updated Scraper Config')
        assert config.name == 'Updated Scraper Config'

        config.delete()
        assert ScraperConfig.get_by_id(config.id, user_id=test_user.id) is None

def test_scraping_job_model(app, test_scraper_config):
    with app.app_context():
        job = ScrapingJob(
            scraper_config_id=test_scraper_config.id,
            user_id=test_scraper_config.user_id,
            status=JobStatus.PENDING
        )
        db.session.add(job)
        db.session.commit()

        assert job.id is not None
        assert job.scraper_config_id == test_scraper_config.id
        assert job.user_id == test_scraper_config.user_id
        assert job.status == JobStatus.PENDING
        assert job.started_at is None
        assert job.finished_at is None

        job.update(status=JobStatus.RUNNING, started_at=datetime.utcnow())
        assert job.status == JobStatus.RUNNING
        assert job.started_at is not None

        jobs = ScrapingJob.get_all(user_id=test_scraper_config.user_id, status='RUNNING')
        assert len(jobs) == 1
        assert jobs[0].id == job.id

        retrieved_job = ScrapingJob.get_by_id(job.id, user_id=test_scraper_config.user_id)
        assert retrieved_job.id == job.id

        job.delete()
        assert ScrapingJob.get_by_id(job.id, user_id=test_scraper_config.user_id) is None

def test_scraping_result_model(app, test_scraping_job):
    with app.app_context():
        result_data = {'field1': 'value1', 'field2': 'value2'}
        result = ScrapingResult(
            job_id=test_scraping_job.id,
            data=result_data,
            url='http://example.com/data'
        )
        db.session.add(result)
        db.session.commit()

        assert result.id is not None
        assert result.job_id == test_scraping_job.id
        assert result.data == result_data
        assert result.url == 'http://example.com/data'

        results = ScrapingResult.get_by_job_id(test_scraping_job.id, user_id=test_scraping_job.user_id)
        assert len(results) == 1
        assert results[0].id == result.id

        result.update(data={'field3': 'value3'})
        assert result.data == {'field3': 'value3'}

        result.delete()
        assert ScrapingResult.query.get(result.id) is None

def test_model_relationships(app, test_user, test_scraper_config, test_scraping_job, test_scraping_result):
    with app.app_context():
        # User -> ScraperConfig
        assert test_user.scraper_configs[0].id == test_scraper_config.id

        # ScraperConfig -> Job
        assert test_scraper_config.jobs[0].id == test_scraping_job.id
        assert test_scraping_job.config.id == test_scraper_config.id

        # Job -> Result
        assert test_scraping_job.results[0].id == test_scraping_result.id
        assert test_scraping_result.job.id == test_scraping_job.id
```