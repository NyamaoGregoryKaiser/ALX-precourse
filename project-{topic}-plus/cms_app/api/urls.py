from django.urls import path, include
from rest_framework.routers import DefaultRouter
from cms_app.api import views as api_views # Alias to avoid name clashes

router = DefaultRouter()
router.register(r'categories', api_views.CategoryViewSet, basename='category')
router.register(r'tags', api_views.TagViewSet, basename='tag')
router.register(r'media', api_views.MediaFileViewSet, basename='mediafile')
router.register(r'articles', api_views.ArticleViewSet, basename='article')
router.register(r'pages', api_views.PageViewSet, basename='page')

urlpatterns = [
    path('', include(router.urls)),
    # Comments API (using generics for more specific URL structure with GenericForeignKey)
    path('<int:content_type_id>/<int:object_id>/comments/', api_views.CommentListCreateAPIView.as_view(), name='content-comment-list-create'),
    path('comments/<int:pk>/', api_views.CommentRetrieveUpdateDestroyAPIView.as_view(), name='comment-detail'),
    path('comments/<int:pk>/approve/', api_views.CommentRetrieveUpdateDestroyAPIView.as_view({'post': 'approve'}), name='comment-approve'),
    path('comments/<int:pk>/unapprove/', api_views.CommentRetrieveUpdateDestroyAPIView.as_view({'post': 'unapprove'}), name='comment-unapprove'),
]
```