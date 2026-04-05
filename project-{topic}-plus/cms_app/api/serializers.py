from rest_framework import serializers
from rest_framework.fields import CurrentUserDefault
from cms_app.models import Category, Tag, MediaFile, Article, Page, Comment
from core_users.api.serializers import UserSerializer # Reusing UserSerializer
from django.contrib.contenttypes.models import ContentType
import logging

logger = logging.getLogger(__name__)

class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for the Category model.
    """
    article_count = serializers.IntegerField(read_only=True)
    page_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'article_count', 'page_count', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'created_at', 'updated_at', 'article_count', 'page_count']

class TagSerializer(serializers.ModelSerializer):
    """
    Serializer for the Tag model.
    """
    article_count = serializers.IntegerField(read_only=True)
    page_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'article_count', 'page_count', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'created_at', 'updated_at', 'article_count', 'page_count']

class MediaFileSerializer(serializers.ModelSerializer):
    """
    Serializer for the MediaFile model.
    Includes the URL of the file and details of the uploader.
    """
    file_url = serializers.CharField(source='file.url', read_only=True)
    uploaded_by = UserSerializer(read_only=True)
    uploaded_by_id = serializers.PrimaryKeyRelatedField(
        queryset=settings.AUTH_USER_MODEL.objects.all(),
        source='uploaded_by',
        write_only=True,
        required=False
    ) # For setting uploaded_by from current user or an admin

    class Meta:
        model = MediaFile
        fields = ['id', 'title', 'file', 'file_url', 'media_type', 'description',
                  'uploaded_by', 'uploaded_by_id', 'created_at', 'updated_at']
        read_only_fields = ['file_url', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Set uploaded_by to the current user if not explicitly provided (e.g., by admin)
        if 'uploaded_by' not in validated_data and 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)

class BaseContentSerializer(serializers.ModelSerializer):
    """
    Base serializer for Content models (Article, Page).
    Includes common fields and relationships.
    """
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=settings.AUTH_USER_MODEL.objects.all(),
        source='author',
        write_only=True,
        required=False
    )
    categories = CategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), many=True, source='categories', write_only=True, required=False
    )
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, source='tags', write_only=True, required=False
    )
    featured_image = MediaFileSerializer(read_only=True)
    featured_image_id = serializers.PrimaryKeyRelatedField(
        queryset=MediaFile.objects.all(), source='featured_image', write_only=True, required=False
    )
    comments_count = serializers.SerializerMethodField()

    class Meta:
        # These are abstract fields, won't be used directly but provide structure
        fields = ['id', 'title', 'slug', 'author', 'author_id', 'status', 'published_at',
                  'created_at', 'updated_at', 'categories', 'category_ids',
                  'tags', 'tag_ids', 'featured_image', 'featured_image_id', 'comments_count']
        read_only_fields = ['slug', 'created_at', 'updated_at', 'comments_count']
        # This will be overridden by subclasses

    def get_comments_count(self, obj):
        # Counts only approved comments
        return obj.comment_set.filter(approved=True).count()

    def create(self, validated_data):
        # Set author to the current user if not explicitly provided
        if 'author' not in validated_data and 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['author'] = self.context['request'].user
        return super().create(validated_data)

class ArticleSerializer(BaseContentSerializer):
    """
    Serializer for the Article model.
    Inherits from BaseContentSerializer.
    """
    class Meta(BaseContentSerializer.Meta):
        model = Article
        fields = BaseContentSerializer.Meta.fields + ['excerpt', 'content', 'word_count']
        read_only_fields = BaseContentSerializer.Meta.read_only_fields + ['word_count']

class PageSerializer(BaseContentSerializer):
    """
    Serializer for the Page model.
    Inherits from BaseContentSerializer.
    """
    parent_page = serializers.PrimaryKeyRelatedField(
        queryset=Page.objects.all(), required=False, allow_null=True
    )
    parent_page_details = serializers.SerializerMethodField(read_only=True)

    class Meta(BaseContentSerializer.Meta):
        model = Page
        fields = BaseContentSerializer.Meta.fields + ['content', 'parent_page', 'parent_page_details', 'template_name']

    def get_parent_page_details(self, obj):
        if obj.parent_page:
            # Recursively use a light serializer to avoid infinite recursion
            return PageMinimalSerializer(obj.parent_page).data
        return None

class PageMinimalSerializer(serializers.ModelSerializer):
    """
    A minimal serializer for Page, used for nested parent_page_details.
    """
    class Meta:
        model = Page
        fields = ['id', 'title', 'slug']


class CommentSerializer(serializers.ModelSerializer):
    """
    Serializer for the Comment model.
    Handles nested replies.
    """
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=settings.AUTH_USER_MODEL.objects.all(),
        source='author',
        write_only=True,
        required=False
    )
    # Using GenericRelatedField for content_object to show its details
    content_object_type = serializers.SerializerMethodField()
    content_object_title = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField() # For nested comments

    class Meta:
        model = Comment
        fields = ['id', 'content_type', 'object_id', 'content_object_type', 'content_object_title',
                  'author', 'author_id', 'body', 'approved', 'parent_comment', 'created_at', 'updated_at', 'replies']
        read_only_fields = ['approved', 'created_at', 'updated_at', 'content_object_type', 'content_object_title']

    def get_content_object_type(self, obj):
        return obj.content_object._meta.model_name if obj.content_object else None

    def get_content_object_title(self, obj):
        return obj.content_object.title if obj.content_object and hasattr(obj.content_object, 'title') else None

    def get_replies(self, obj):
        # Recursively serialize replies, but prevent infinite depth
        if obj.replies.exists() and self.context.get('depth', 0) < 3: # Limit recursion depth
            return CommentSerializer(
                obj.replies.filter(approved=True).select_related('author'),
                many=True,
                context={'request': self.context['request'], 'depth': self.context.get('depth', 0) + 1}
            ).data
        return []

    def create(self, validated_data):
        # Set author to the current user if not explicitly provided
        if 'author' not in validated_data and 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['author'] = self.context['request'].user

        # Ensure content_type and object_id are passed correctly for GenericForeignKey
        content_type_id = self.context['request'].parser_context['kwargs'].get('content_type_id')
        object_id = self.context['request'].parser_context['kwargs'].get('object_id')

        if content_type_id and object_id:
            try:
                content_type = ContentType.objects.get_for_id(content_type_id)
                content_object = content_type.get_object_for_this_type(pk=object_id)
                validated_data['content_type'] = content_type
                validated_data['object_id'] = object_id
            except (ContentType.DoesNotExist, content_type.model_class().DoesNotExist) as e:
                raise serializers.ValidationError(f"Invalid content_type or object_id: {e}")
        else:
            raise serializers.ValidationError("content_type_id and object_id are required for comments.")

        comment = super().create(validated_data)
        logger.info(f"New comment (ID: {comment.id}) created by {comment.author} on {comment.content_object}")
        return comment

from django.conf import settings # For settings.AUTH_USER_MODEL
```