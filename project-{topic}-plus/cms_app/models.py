import os
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.urls import reverse
from django.conf import settings
from django.core.validators import FileExtensionValidator
from core_users.models import User
import logging

logger = logging.getLogger(__name__)

# Helper function for media upload path
def get_media_upload_path(instance, filename):
    """
    Returns the upload path for media files, organized by year/month.
    """
    now = timezone.now()
    return os.path.join('uploads', now.strftime('%Y'), now.strftime('%m'), filename)

class TimestampedModel(models.Model):
    """
    An abstract base class model that provides self-updating
    `created_at` and `updated_at` fields.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

class Category(TimestampedModel):
    """
    Model for organizing content into categories.
    """
    name = models.CharField(max_length=100, unique=True, help_text="Name of the category.")
    slug = models.SlugField(max_length=100, unique=True, blank=True,
                            help_text="URL-friendly version of the name. Auto-generated.")
    description = models.TextField(blank=True, help_text="Short description of the category.")

    class Meta(TimestampedModel.Meta):
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('cms_app:category_detail', kwargs={'slug': self.slug})

class Tag(TimestampedModel):
    """
    Model for tagging content.
    """
    name = models.CharField(max_length=100, unique=True, help_text="Name of the tag.")
    slug = models.SlugField(max_length=100, unique=True, blank=True,
                            help_text="URL-friendly version of the name. Auto-generated.")

    class Meta(TimestampedModel.Meta):
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('cms_app:tag_detail', kwargs={'slug': self.slug})

class MediaFile(TimestampedModel):
    """
    Model for uploading and managing media files (images, documents).
    """
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('document', 'Document'),
        ('video', 'Video'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=255, help_text="Title of the media file.")
    file = models.FileField(
        upload_to=get_media_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'mov'])],
        help_text="The actual media file."
    )
    media_type = models.CharField(
        max_length=10,
        choices=MEDIA_TYPES,
        default='other',
        help_text="Type of media file."
    )
    description = models.TextField(blank=True, help_text="Description of the media file.")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_media',
        help_text="User who uploaded the file."
    )

    class Meta(TimestampedModel.Meta):
        verbose_name_plural = "Media Files"
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def file_url(self):
        if self.file:
            return self.file.url
        return ""

class Content(TimestampedModel):
    """
    Abstract base model for various content types (e.g., Article, Page, Blog Post).
    Provides common fields and functionality.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=255, help_text="Title of the content.")
    slug = models.SlugField(max_length=255, unique=True, blank=True,
                            help_text="URL-friendly version of the title. Auto-generated.")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='%(class)s_content', # Dynamically sets related_name based on subclass
        help_text="Author of the content."
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='draft',
        help_text="Publication status of the content."
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when the content was published."
    )
    categories = models.ManyToManyField(
        Category,
        blank=True,
        related_name='%(class)s_content',
        help_text="Categories for this content."
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name='%(class)s_content',
        help_text="Tags for this content."
    )
    featured_image = models.ForeignKey(
        MediaFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='featured_on_%(class)s',
        help_text="Featured image for the content."
    )

    class Meta(TimestampedModel.Meta):
        abstract = True
        unique_together = ['slug',] # Ensure slug is unique across subclasses too
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        # Ensure published_at is set if status changes to 'published' and it's not already set
        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def is_published(self):
        return self.status == 'published' and self.published_at <= timezone.now()

    def publish(self):
        self.status = 'published'
        self.published_at = timezone.now()
        self.save()
        logger.info(f"Content '{self.title}' (ID: {self.id}) published by {self.author}")

    def unpublish(self):
        self.status = 'draft'
        # self.published_at = None # Optionally clear published_at if unpublishing
        self.save()
        logger.info(f"Content '{self.title}' (ID: {self.id}) unpublished by {self.author}")


class Article(Content):
    """
    A specific content type for articles or blog posts.
    """
    excerpt = models.TextField(blank=True, help_text="A short summary of the article.")
    content = models.TextField(help_text="Full content of the article (can be Markdown/HTML).")
    word_count = models.PositiveIntegerField(default=0, editable=False,
                                             help_text="Approximate word count of the article content.")

    class Meta(Content.Meta):
        verbose_name_plural = "Articles"
        default_related_name = 'articles' # Explicit default for Article subclass
        db_table = 'cms_app_article' # Explicit table name to avoid potential conflicts with other Content subclasses

    def get_absolute_url(self):
        return reverse('cms_app:article_detail', kwargs={'slug': self.slug})

    def save(self, *args, **kwargs):
        # Update word count before saving
        if self.content:
            self.word_count = len(self.content.split())
        super().save(*args, **kwargs)


class Page(Content):
    """
    A specific content type for static pages (e.g., About Us, Contact).
    """
    content = models.TextField(help_text="Full content of the page (can be Markdown/HTML).")
    # Pages might have parent pages for hierarchy
    parent_page = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_pages',
        help_text="Parent page in a hierarchical structure."
    )
    template_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional custom template for this page (e.g., 'about_us_template.html')."
    )

    class Meta(Content.Meta):
        verbose_name_plural = "Pages"
        default_related_name = 'pages' # Explicit default for Page subclass
        db_table = 'cms_app_page' # Explicit table name
        ordering = ['title'] # Pages might be better ordered by title

    def get_absolute_url(self):
        return reverse('cms_app:page_detail', kwargs={'slug': self.slug})


class Comment(TimestampedModel):
    """
    Model for user comments on content.
    """
    content_type = models.ForeignKey('contenttypes.ContentType', on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = models.GenericForeignKey('content_type', 'object_id') # Links to any Content object

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
        help_text="User who posted the comment."
    )
    body = models.TextField(help_text="The comment text.")
    approved = models.BooleanField(default=False, help_text="Whether the comment has been approved by a moderator.")
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        help_text="Parent comment for threaded discussions."
    )

    class Meta(TimestampedModel.Meta):
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on {self.content_object}"

    def approve(self):
        self.approved = True
        self.save()
        logger.info(f"Comment (ID: {self.id}) approved.")

    def unapprove(self):
        self.approved = False
        self.save()
        logger.info(f"Comment (ID: {self.id}) unapproved.")
```