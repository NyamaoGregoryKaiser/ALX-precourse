from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


urlpatterns = [
    # Admin Panel
    path('admin/', admin.site.urls),

    # Project Apps
    path('', include('cms_app.urls')), # Main CMS views
    path('accounts/', include('core_users.urls')), # User management and auth
    path('api-auth/', include('rest_framework.urls')), # DRF Login/Logout (for browsable API)

    # API Endpoints with JWT Authentication
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # API Schema and UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API Core Apps
    path('api/v1/users/', include('core_users.api.urls')),
    path('api/v1/cms/', include('cms_app.api.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) # For collectstatic in dev

    # Django Debug Toolbar
    import debug_toolbar
    urlpatterns += [path('__debug__/', include(debug_toolbar.urls))]

# Custom error handlers
handler404 = 'my_enterprise_cms.views.custom_404'
handler500 = 'my_enterprise_cms.views.custom_500'
```