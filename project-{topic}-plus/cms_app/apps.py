from django.apps import AppConfig

class CmsAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cms_app'
    verbose_name = 'Content Management'

    def ready(self):
        import cms_app.signals # Import signals to connect them
```