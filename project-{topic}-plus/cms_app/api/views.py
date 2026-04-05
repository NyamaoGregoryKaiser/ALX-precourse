from rest_framework import viewsets, filters, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType
from cms_app.models import Category, Tag, MediaFile, Article, Page, Comment
from .serializers import (
    CategorySerializer, TagSerializer, MediaFileSerializer,
    ArticleSerializer, PageSerializer, CommentSerializer
)
from cms_app.permissions import IsAuthorOrAdminOrReadOnly, IsStaffOrReadOnly, IsCommentAuthorOrModerator
import logging

logger = logging.getLogger(__name__)

# --- Category API ---
class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows categories to be viewed, created, updated or deleted.
    Staff users can perform full CRUD. Regular users have read-only access.
    """
    queryset = Category.objects.annotate(
        article_count=Count('article_content', distinct=True),
        page_count=Count('page_content', distinct=True)
    ).order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = 'slug' # Allow lookup by slug

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['name']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'article_count', 'page_count']

# --- Tag API ---
class TagViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows tags to be viewed, created, updated or deleted.
    Staff users can perform full CRUD. Regular users have read-only access.
    """
    queryset = Tag.objects.annotate(
        article_count=Count('article_content', distinct=True),
        page_count=Count('page_content', distinct=True)
    ).order_by('name')
    serializer_class = TagSerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = 'slug' # Allow lookup by slug

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['name']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'article_count', 'page_count']

# --- MediaFile API ---
class MediaFileViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows media files to be viewed, uploaded, updated or deleted.
    Only authenticated staff users can upload, update, or delete media.
    All users can view media files.
    """
    queryset = MediaFile.objects.all().select_related('uploaded_by').order_by('-created_at')
    serializer_class = MediaFileSerializer
    permission_classes = [IsStaffOrReadOnly] # Allow read for all, write for staff

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['media_type', 'uploaded_by__username']
    search_fields = ['title', 'description', 'uploaded_by__username']
    ordering_fields = ['title', 'media_type', 'created_at']

    def perform_create(self, serializer):
        # Ensure uploaded_by is set to the current user if not explicitly provided
        serializer.save(uploaded_by=self.request.user)
        logger.info(f"Media file '{serializer.instance.title}' (ID: {serializer.instance.id}) uploaded by {self.request.user}")

    def perform_destroy(self, instance):
        logger.info(f"Media file '{instance.title}' (ID: {instance.id}) deleted by {self.request.user}")
        instance.delete()

# --- Article API ---
class ArticleViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows articles to be viewed, created, updated or deleted.
    Authenticated users can create articles.
    Authors or staff can update/delete their own articles.
    All users can view published articles.
    """
    queryset = Article.objects.filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image').prefetch_related('categories', 'tags').order_by('-published_at')
    serializer_class = ArticleSerializer
    lookup_field = 'slug' # Allow lookup by slug

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['author__username', 'categories__slug', 'tags__slug', 'status']
    search_fields = ['title', 'content', 'excerpt', 'author__username', 'categories__name', 'tags__name']
    ordering_fields = ['title', 'published_at', 'created_at', 'word_count']

    def get_queryset(self):
        # If user is staff, allow them to see all articles (draft, archived included)
        if self.request.user.is_staff:
            return Article.objects.all().select_related('author', 'featured_image').prefetch_related('categories', 'tags').order_by('-published_at')
        return super().get_queryset()

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create']:
            permission_classes = [IsAuthenticated] # Only authenticated users can create
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthorOrAdminOrReadOnly] # Only author or admin can modify/delete
        else:
            permission_classes = [IsAuthenticatedOrReadOnly] # Read for all, authenticated for others
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        # Set author to the current user if not explicitly provided
        serializer.save(author=self.request.user)
        logger.info(f"Article '{serializer.instance.title}' (ID: {serializer.instance.id}) created by {self.request.user}")

    def perform_update(self, serializer):
        serializer.save()
        logger.info(f"Article '{serializer.instance.title}' (ID: {serializer.instance.id}) updated by {self.request.user}")

    def perform_destroy(self, instance):
        logger.info(f"Article '{instance.title}' (ID: {instance.id}) deleted by {self.request.user}")
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthorOrAdminOrReadOnly])
    def publish(self, request, slug=None):
        article = self.get_object()
        article.publish()
        return Response({'status': 'article published', 'published_at': article.published_at}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthorOrAdminOrReadOnly])
    def unpublish(self, request, slug=None):
        article = self.get_object()
        article.unpublish()
        return Response({'status': 'article unpublished'}, status=status.HTTP_200_OK)

# --- Page API ---
class PageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows pages to be viewed, created, updated or deleted.
    Permissions are similar to ArticleViewSet.
    """
    queryset = Page.objects.filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image', 'parent_page').prefetch_related('categories', 'tags').order_by('-published_at')
    serializer_class = PageSerializer
    lookup_field = 'slug' # Allow lookup by slug

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['author__username', 'categories__slug', 'tags__slug', 'parent_page__slug', 'status']
    search_fields = ['title', 'content', 'author__username', 'categories__name', 'tags__name']
    ordering_fields = ['title', 'published_at', 'created_at']

    def get_queryset(self):
        # If user is staff, allow them to see all pages (draft, archived included)
        if self.request.user.is_staff:
            return Page.objects.all().select_related('author', 'featured_image', 'parent_page').prefetch_related('categories', 'tags').order_by('-published_at')
        return super().get_queryset()

    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthorOrAdminOrReadOnly]
        else:
            permission_classes = [IsAuthenticatedOrReadOnly]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
        logger.info(f"Page '{serializer.instance.title}' (ID: {serializer.instance.id}) created by {self.request.user}")

    def perform_update(self, serializer):
        serializer.save()
        logger.info(f"Page '{serializer.instance.title}' (ID: {serializer.instance.id}) updated by {self.request.user}")

    def perform_destroy(self, instance):
        logger.info(f"Page '{instance.title}' (ID: {instance.id}) deleted by {self.request.user}")
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthorOrAdminOrReadOnly])
    def publish(self, request, slug=None):
        page = self.get_object()
        page.publish()
        return Response({'status': 'page published', 'published_at': page.published_at}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthorOrAdminOrReadOnly])
    def unpublish(self, request, slug=None):
        page = self.get_object()
        page.unpublish()
        return Response({'status': 'page unpublished'}, status=status.HTTP_200_OK)

# --- Comment API ---
class CommentListCreateAPIView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating comments for a specific content object.
    Requires content_type_id and object_id in the URL.
    Only approved top-level comments and their approved replies are listed.
    Any authenticated user can create a comment.
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['author__username', 'approved']
    ordering_fields = ['created_at']

    def get_queryset(self):
        content_type_id = self.kwargs.get('content_type_id')
        object_id = self.kwargs.get('object_id')

        content_type = get_object_or_404(ContentType, pk=content_type_id)
        content_object = get_object_or_404(content_type.model_class(), pk=object_id)

        queryset = content_object.comment_set.filter(parent_comment__isnull=True).select_related('author').prefetch_related('replies__author')

        # Staff can see all comments (approved/unapproved) for a content object.
        # Regular users only see approved comments.
        if not self.request.user.is_staff:
            queryset = queryset.filter(approved=True)

        return queryset

    def perform_create(self, serializer):
        # The content_type and object_id are handled in the serializer's create method
        # for GenericForeignKey. The author is set from request.user.
        serializer.save(author=self.request.user)


class CommentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for retrieving, updating, or deleting a specific comment.
    Comment authors or staff can update/delete comments.
    """
    queryset = Comment.objects.all().select_related('author', 'content_type').prefetch_related('replies__author')
    serializer_class = CommentSerializer
    permission_classes = [IsCommentAuthorOrModerator] # Custom permission

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        comment = self.get_object()
        comment.approve()
        return Response({'status': 'comment approved'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def unapprove(self, request, pk=None):
        comment = self.get_object()
        comment.unapprove()
        return Response({'status': 'comment unapproved'}, status=status.HTTP_200_OK)
```