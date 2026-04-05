from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html
from django.utils import timezone
from .models import Category, Tag, MediaFile, Article, Page, Comment

# Admin for Category
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'description', 'content_count', 'created_at', 'updated_at')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ('created_at', 'updated_at')

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        # Annotate with the count of articles and pages for each category
        queryset = queryset.annotate(
            total_content=Count('article_content', distinct=True) + Count('page_content', distinct=True)
        )
        return queryset

    @admin.display(description='Content Count', ordering='total_content')
    def content_count(self, obj):
        return obj.total_content

# Admin for Tag
@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'content_count', 'created_at', 'updated_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ('created_at',)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        # Annotate with the count of articles and pages for each tag
        queryset = queryset.annotate(
            total_content=Count('article_content', distinct=True) + Count('page_content', distinct=True)
        )
        return queryset

    @admin.display(description='Content Count', ordering='total_content')
    def content_count(self, obj):
        return obj.total_content

# Admin for MediaFile
@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ('title', 'media_type', 'uploaded_by', 'thumbnail_preview', 'created_at', 'file_url_display')
    list_filter = ('media_type', 'uploaded_by', 'created_at')
    search_fields = ('title', 'description', 'uploaded_by__username')
    readonly_fields = ('thumbnail_preview', 'file_url_display')

    def save_model(self, request, obj, form, change):
        if not obj.uploaded_by: # Set uploader if not already set (e.g., from admin creation)
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)

    @admin.display(description='Preview')
    def thumbnail_preview(self, obj):
        if obj.media_type == 'image' and obj.file:
            return format_html(f'<img src="{obj.file.url}" style="max-height: 80px; max-width: 80px;" />')
        return "No preview"

    @admin.display(description='File URL')
    def file_url_display(self, obj):
        if obj.file:
            return format_html(f'<a href="{obj.file.url}" target="_blank">{obj.file.name.split("/")[-1]}</a>')
        return "N/A"

# Base Admin for Content types (Article, Page)
class ContentAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'status', 'published_at', 'created_at', 'updated_at')
    list_filter = ('status', 'categories', 'tags', 'author', 'created_at', 'published_at')
    search_fields = ('title', 'content', 'author__username', 'categories__name', 'tags__name')
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'published_at'
    raw_id_fields = ('author', 'featured_image',) # Use raw_id_fields for FKs to prevent huge dropdowns

    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'status', 'author', 'published_at')
        }),
        ('Content Details', {
            'fields': ('featured_image', 'categories', 'tags')
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('author', 'featured_image').prefetch_related('categories', 'tags')

    def save_model(self, request, obj, form, change):
        if not obj.author:
            obj.author = request.user
        # Automatically set published_at if status changes to 'published' and it's not already set
        if obj.status == 'published' and not obj.published_at:
            obj.published_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(Article)
class ArticleAdmin(ContentAdmin):
    fieldsets = ContentAdmin.fieldsets + (
        ('Article Specifics', {
            'fields': ('excerpt', 'content', 'word_count')
        }),
    )
    readonly_fields = ('word_count',) # word_count is auto-calculated

@admin.register(Page)
class PageAdmin(ContentAdmin):
    list_display = ('title', 'author', 'status', 'parent_page', 'template_name', 'published_at', 'updated_at')
    list_filter = ('status', 'template_name', 'parent_page', 'author', 'created_at')
    fieldsets = ContentAdmin.fieldsets + (
        ('Page Specifics', {
            'fields': ('content', 'parent_page', 'template_name')
        }),
    )
    raw_id_fields = ('author', 'featured_image', 'parent_page') # Add parent_page to raw_id_fields


# Admin for Comment
@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'content_object', 'body_excerpt', 'approved', 'parent_comment', 'created_at')
    list_filter = ('approved', 'created_at', 'author')
    search_fields = ('author__username', 'body')
    raw_id_fields = ('author', 'parent_comment')
    actions = ['approve_comments', 'disapprove_comments']

    def get_queryset(self, request):
        # Optimize query for content_object to reduce N+1 queries
        qs = super().get_queryset(request)
        return qs.select_related('author', 'parent_comment', 'content_type')

    @admin.display(description='Comment Body', short_description='Body')
    def body_excerpt(self, obj):
        return obj.body[:75] + '...' if len(obj.body) > 75 else obj.body

    @admin.action(description='Approve selected comments')
    def approve_comments(self, request, queryset):
        count = queryset.update(approved=True)
        self.message_user(request, f'{count} comments were successfully approved.')

    @admin.action(description='Disapprove selected comments')
    def disapprove_comments(self, request, queryset):
        count = queryset.update(approved=False)
        self.message_user(request, f'{count} comments were successfully disapproved.')
```