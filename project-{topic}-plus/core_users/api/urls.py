from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user') # Register UserViewSet

urlpatterns = [
    path('register/', UserViewSet.as_view({'post': 'create'}), name='user-register'), # Custom route for registration
    path('', include(router.urls)), # Include all other routes from the UserViewSet
]
```