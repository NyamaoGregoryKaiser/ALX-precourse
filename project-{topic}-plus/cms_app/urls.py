from django.urls import path
from . import views

app_name = 'cms_app'

urlpatterns = [
    # General
    path('', views.HomeView.as_view(), name='home'),
    path('search/', views.SearchView.as_view(), name='search'),

    # Articles
    path('articles/', views.ArticleListView.as_view(), name='article_list'),
    path('articles/new/', views.ArticleCreateView.as_view(), name='article_create'),
    path('articles/<slug:slug>/', views.ArticleDetailView.as_view(), name='article_detail'),
    path('articles/<slug:slug>/edit/', views.ArticleUpdateView.as_view(), name='article_update'),
    path('articles/<slug:slug>/delete/', views.ArticleDeleteView.as_view(), name='article_delete'),

    # Pages
    path('pages/', views.PageListView.as_view(), name='page_list'),
    path('pages/new/', views.PageCreateView.as_view(), name='page_create'),
    path('pages/<slug:slug>/', views.PageDetailView.as_view(), name='page_detail'),
    path('pages/<slug:slug>/edit/', views.PageUpdateView.as_view(), name='page_update'),
    path('pages/<slug:slug>/delete/', views.PageDeleteView.as_view(), name='page_delete'),

    # Categories
    path('categories/', views.CategoryListView.as_view(), name='category_list'),
    path('categories/new/', views.CategoryCreateView.as_view(), name='category_create'),
    path('categories/<slug:slug>/', views.CategoryDetailView.as_view(), name='category_detail'),
    path('categories/<slug:slug>/edit/', views.CategoryUpdateView.as_view(), name='category_update'),
    path('categories/<slug:slug>/delete/', views.CategoryDeleteView.as_view(), name='category_delete'),

    # Tags
    path('tags/', views.TagListView.as_view(), name='tag_list'),
    path('tags/new/', views.TagCreateView.as_view(), name='tag_create'),
    path('tags/<slug:slug>/', views.TagDetailView.as_view(), name='tag_detail'),
    path('tags/<slug:slug>/edit/', views.TagUpdateView.as_view(), name='tag_update'),
    path('tags/<slug:slug>/delete/', views.TagDeleteView.as_view(), name='tag_delete'),

    # Media Files
    path('media/', views.MediaFileListView.as_view(), name='media_list'),
    path('media/new/', views.MediaFileCreateView.as_view(), name='media_create'),
    path('media/<int:pk>/edit/', views.MediaFileUpdateView.as_view(), name='media_update'),
    path('media/<int:pk>/delete/', views.MediaFileDeleteView.as_view(), name='media_delete'),

    # Comments (HTMX Endpoints)
    path('comments/post/<int:content_type_id>/<int:object_id>/', views.post_comment, name='post_comment'),
    path('comments/delete/<int:pk>/', views.delete_comment, name='delete_comment'),
]
```