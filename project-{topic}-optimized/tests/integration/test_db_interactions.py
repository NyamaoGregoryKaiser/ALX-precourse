import pytest
from app import db
from app.models.user import User
from app.models.scraper_config import ScraperConfig
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraping_result import ScrapingResult
from datetime import datetime

def test_user_scraper_config_relationship(app):
    with app.app_context():
        user = User(username='rel_user', email='rel@example.com')
        user.set_password('password')
        db.session.add(user)
        db.session.commit()

        config1 = ScraperConfig(user_id=user.id, name='Config 1', start_url='http://config1.com', css_selectors={})
        config2 = ScraperConfig(user_id=user.id, name='Config 2', start_url='http://config2.com', css_selectors={})
        db.session.add_all([config1, config2])
        db.session.commit()

        # Check forward relationship from User to ScraperConfigs
        retrieved_user = User.query.get(user.id)
        assert len(retrieved_user.scraper_configs) == 2
        assert {c.name for c in retrieved_user.scraper_configs} == {'Config 1', 'Config 2'}

        # Check backward relationship from ScraperConfig to User
        retrieved_config1 = ScraperConfig.query.get(config1.id)
        assert retrieved_config1.user.username == 'rel_user'

        # Deleting user should cascade delete configs (if configured)
        # Note: 'cascade="all, delete-orphan"' is configured in models for relationships
        user.delete()
        assert ScraperConfig.query.get(config1.id) is None
        assert ScraperConfig.query.get(config2.id) is None

def test_scraper_config_job_relationship(app, test_user):
    with app.app_context():
        config = ScraperConfig(user_id=test_user.id, name='JobConfig', start_url='http://jobconfig.com', css_selectors={})
        db.session.add(config)
        db.session.commit()

        job1 = ScrapingJob(scraper_config_id=config.id, user_id=test_user.id, status=JobStatus.PENDING)
        job2 = ScrapingJob(scraper_config_id=config.id, user_id=test_user.id, status=JobStatus.COMPLETED)
        db.session.add_all([job1, job2])
        db.session.commit()

        # Check forward relationship from ScraperConfig to Jobs
        retrieved_config = ScraperConfig.query.get(config.id)
        assert len(retrieved_config.jobs) == 2
        assert {j.status for j in retrieved_config.jobs} == {JobStatus.PENDING, JobStatus.COMPLETED}

        # Check backward relationship from Job to ScraperConfig
        retrieved_job1 = ScrapingJob.query.get(job1.id)
        assert retrieved_job1.config.name == 'JobConfig'

        # Deleting config should cascade delete jobs
        config.delete()
        assert ScrapingJob.query.get(job1.id) is None
        assert ScrapingJob.query.get(job2.id) is None

def test_scraping_job_result_relationship(app, test_user, test_scraper_config):
    with app.app_context():
        job = ScrapingJob(scraper_config_id=test_scraper_config.id, user_id=test_user.id, status=JobStatus.RUNNING)
        db.session.add(job)
        db.session.commit()

        result1 = ScrapingResult(job_id=job.id, data={'item': 'data1'}, url='http://res1.com')
        result2 = ScrapingResult(job_id=job.id, data={'item': 'data2'}, url='http://res2.com')
        db.session.add_all([result1, result2])
        db.session.commit()

        # Check forward relationship from Job to Results
        retrieved_job = ScrapingJob.query.get(job.id)
        assert len(retrieved_job.results) == 2
        assert {r.url for r in retrieved_job.results} == {'http://res1.com', 'http://res2.com'}

        # Check backward relationship from Result to Job
        retrieved_result1 = ScrapingResult.query.get(result1.id)
        assert retrieved_result1.job.status == JobStatus.RUNNING

        # Deleting job should cascade delete results
        job.delete()
        assert ScrapingResult.query.get(result1.id) is None
        assert ScrapingResult.query.get(result2.id) is None

def test_full_cascade_delete(app, test_user):
    with app.app_context():
        # Create a full hierarchy
        user = User(username='cascade_user', email='cascade@example.com')
        user.set_password('password')
        db.session.add(user)
        db.session.commit()

        config = ScraperConfig(user_id=user.id, name='Cascade Config', start_url='http://cascade.com', css_selectors={})
        db.session.add(config)
        db.session.commit()

        job = ScrapingJob(scraper_config_id=config.id, user_id=user.id, status=JobStatus.COMPLETED)
        db.session.add(job)
        db.session.commit()

        result = ScrapingResult(job_id=job.id, data={'final': 'data'}, url='http://cascade.com/final')
        db.session.add(result)
        db.session.commit()

        # Verify initial state
        assert User.query.get(user.id) is not None
        assert ScraperConfig.query.get(config.id) is not None
        assert ScrapingJob.query.get(job.id) is not None
        assert ScrapingResult.query.get(result.id) is not None

        # Delete the user
        user.delete()
        db.session.commit() # Ensure changes are flushed

        # Verify all related objects are deleted
        assert User.query.get(user.id) is None
        assert ScraperConfig.query.get(config.id) is None
        assert ScrapingJob.query.get(job.id) is None
        assert ScrapingResult.query.get(result.id) is None

```