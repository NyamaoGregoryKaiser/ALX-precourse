from app.models.scraper_config import ScraperConfig
from app.utils.errors import NotFoundError, BadRequestError
from app import db, cache, current_app

class ScraperConfigService:
    @staticmethod
    def create_scraper_config(user_id, name, start_url, css_selectors, description=None):
        if ScraperConfig.query.filter_by(name=name, user_id=user_id).first():
            raise BadRequestError(f"Scraper config with name '{name}' already exists for this user.")

        config = ScraperConfig(
            user_id=user_id,
            name=name,
            start_url=str(start_url), # Pydantic HttpUrl converts to string automatically
            css_selectors=css_selectors,
            description=description
        )
        config.save()
        cache.delete_memoized(ScraperConfigService.get_all_scraper_configs, user_id)
        current_app.logger.info(f"Scraper config '{name}' created by user {user_id}.")
        return config

    @staticmethod
    @cache.memoize(timeout=300) # Cache for 5 minutes
    def get_all_scraper_configs(user_id):
        configs = ScraperConfig.get_all(user_id=user_id)
        current_app.logger.debug(f"Retrieved {len(configs)} scraper configs for user {user_id}.")
        return configs

    @staticmethod
    @cache.memoize(timeout=300)
    def get_scraper_config_by_id(config_id, user_id):
        config = ScraperConfig.get_by_id(config_id, user_id=user_id)
        if not config:
            raise NotFoundError(f"Scraper config with ID {config_id} not found.")
        current_app.logger.debug(f"Retrieved scraper config {config_id} for user {user_id}.")
        return config

    @staticmethod
    def update_scraper_config(config_id, user_id, **kwargs):
        config = ScraperConfigService.get_scraper_config_by_id(config_id, user_id) # This already checks ownership

        if 'name' in kwargs and ScraperConfig.query.filter_by(name=kwargs['name'], user_id=user_id).filter(ScraperConfig.id != config_id).first():
            raise BadRequestError(f"Scraper config with name '{kwargs['name']}' already exists for this user.")

        config.update(**kwargs)
        cache.delete_memoized(ScraperConfigService.get_all_scraper_configs, user_id)
        cache.delete_memoized(ScraperConfigService.get_scraper_config_by_id, config_id, user_id)
        current_app.logger.info(f"Scraper config {config_id} updated by user {user_id}.")
        return config

    @staticmethod
    def delete_scraper_config(config_id, user_id):
        config = ScraperConfigService.get_scraper_config_by_id(config_id, user_id) # This already checks ownership
        config.delete()
        cache.delete_memoized(ScraperConfigService.get_all_scraper_configs, user_id)
        cache.delete_memoized(ScraperConfigService.get_scraper_config_by_id, config_id, user_id)
        current_app.logger.info(f"Scraper config {config_id} deleted by user {user_id}.")
```