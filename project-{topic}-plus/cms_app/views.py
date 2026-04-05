from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Q
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.contrib import messages
from .models import Article, Page, Category, Tag, Comment, MediaFile
from .forms import ArticleForm, PageForm, CommentForm, CategoryForm, TagForm, MediaFileForm
from .permissions import AuthorOrStaffRequiredMixin, StaffRequiredMixin # Custom Mixins
import logging
import time

logger = logging.getLogger(__name__)

# --- Home & Search Views ---
@method_decorator(cache_page(60 * 5), name='dispatch') # Cache homepage for 5 minutes
class HomeView(ListView):
    template_name = 'cms_app/home.html'
    context_object_name = 'articles'
    paginate_by = 5

    def get_queryset(self):
        # Fetch only published articles, ordered by publication date
        queryset = Article.objects.filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image').prefetch_related('categories', 'tags')
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add recently published pages to context
        context['pages'] = Page.objects.filter(status='published', published_at__lte=timezone.now()).order_by('-published_at')[:3]
        context['categories'] = Category.objects.annotate(num_articles=Count('article_content')).filter(num_articles__gt=0).order_by('name')
        context['tags'] = Tag.objects.annotate(num_articles=Count('article_content')).filter(num_articles__gt=0).order_by('name')
        return context

class SearchView(ListView):
    template_name = 'cms_app/search_results.html'
    context_object_name = 'results'
    paginate_by = 10

    def get_queryset(self):
        query = self.request.GET.get('q')
        if query:
            # Measure query performance for demonstration
            start_time = time.time()
            articles = Article.objects.filter(
                Q(title__icontains=query) |
                Q(content__icontains=query) |
                Q(excerpt__icontains=query) |
                Q(author__username__icontains=query) |
                Q(categories__name__icontains=query) |
                Q(tags__name__icontains=query)
            ).filter(status='published', published_at__lte=timezone.now()).distinct().select_related('author').prefetch_related('categories', 'tags')

            pages = Page.objects.filter(
                Q(title__icontains=query) |
                Q(content__icontains=query) |
                Q(author__username__icontains=query) |
                Q(categories__name__icontains=query) |
                Q(tags__name__icontains=query)
            ).filter(status='published', published_at__lte=timezone.now()).distinct().select_related('author').prefetch_related('categories', 'tags')

            # Combine and sort results
            combined_results = sorted(list(articles) + list(pages), key=lambda x: x.published_at or x.created_at, reverse=True)
            end_time = time.time()
            logger.info(f"Search for '{query}' took {end_time - start_time:.4f} seconds.")
            return combined_results
        return []

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['query'] = self.request.GET.get('q', '')
        return context

# --- Article Views ---
class ArticleListView(ListView):
    model = Article
    template_name = 'cms_app/article_list.html'
    context_object_name = 'articles'
    paginate_by = 10

    def get_queryset(self):
        # Fetch only published articles
        queryset = super().get_queryset().filter(status='published', published_at__lte=timezone.now())
        # Optimize queries using select_related for foreign keys and prefetch_related for many-to-many
        queryset = queryset.select_related('author', 'featured_image').prefetch_related('categories', 'tags')
        return queryset

@method_decorator(cache_page(60 * 15), name='dispatch') # Cache article detail for 15 minutes
class ArticleDetailView(DetailView):
    model = Article
    template_name = 'cms_app/article_detail.html'
    context_object_name = 'article'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_queryset(self):
        # Ensure only published articles are accessible via public detail view
        return super().get_queryset().filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image').prefetch_related('categories', 'tags')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        article = self.object
        context['comments'] = article.comment_set.filter(approved=True, parent_comment__isnull=True).select_related('author').prefetch_related('replies__author') # Only top-level approved comments
        context['comment_form'] = CommentForm()
        return context

@login_required
class ArticleCreateView(LoginRequiredMixin, CreateView):
    model = Article
    form_class = ArticleForm
    template_name = 'cms_app/article_form.html'
    success_url = reverse_lazy('cms_app:article_list')

    def form_valid(self, form):
        form.instance.author = self.request.user
        messages.success(self.request, 'Article created successfully!')
        return super().form_valid(form)

@login_required
class ArticleUpdateView(LoginRequiredMixin, AuthorOrStaffRequiredMixin, UpdateView):
    model = Article
    form_class = ArticleForm
    template_name = 'cms_app/article_form.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_success_url(self):
        messages.success(self.request, 'Article updated successfully!')
        return reverse_lazy('cms_app:article_detail', kwargs={'slug': self.object.slug})

@login_required
class ArticleDeleteView(LoginRequiredMixin, AuthorOrStaffRequiredMixin, DeleteView):
    model = Article
    template_name = 'cms_app/article_confirm_delete.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'
    success_url = reverse_lazy('cms_app:article_list')

    def form_valid(self, form):
        messages.success(self.request, f"Article '{self.object.title}' deleted successfully!")
        return super().form_valid(form)

# --- Page Views ---
class PageListView(ListView):
    model = Page
    template_name = 'cms_app/page_list.html'
    context_object_name = 'pages'
    paginate_by = 10

    def get_queryset(self):
        # Fetch only published pages, optimize queries
        queryset = super().get_queryset().filter(status='published', published_at__lte=timezone.now())
        queryset = queryset.select_related('author', 'featured_image', 'parent_page').prefetch_related('categories', 'tags')
        return queryset

@method_decorator(cache_page(60 * 15), name='dispatch') # Cache page detail for 15 minutes
class PageDetailView(DetailView):
    model = Page
    template_name = 'cms_app/page_detail.html'
    context_object_name = 'page'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_queryset(self):
        # Ensure only published pages are accessible via public detail view
        return super().get_queryset().filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image', 'parent_page').prefetch_related('categories', 'tags')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        page = self.object
        context['comments'] = page.comment_set.filter(approved=True, parent_comment__isnull=True).select_related('author').prefetch_related('replies__author')
        context['comment_form'] = CommentForm()
        return context

@login_required
class PageCreateView(LoginRequiredMixin, CreateView):
    model = Page
    form_class = PageForm
    template_name = 'cms_app/page_form.html'
    success_url = reverse_lazy('cms_app:page_list')

    def form_valid(self, form):
        form.instance.author = self.request.user
        messages.success(self.request, 'Page created successfully!')
        return super().form_valid(form)

@login_required
class PageUpdateView(LoginRequiredMixin, AuthorOrStaffRequiredMixin, UpdateView):
    model = Page
    form_class = PageForm
    template_name = 'cms_app/page_form.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_success_url(self):
        messages.success(self.request, 'Page updated successfully!')
        return reverse_lazy('cms_app:page_detail', kwargs={'slug': self.object.slug})

@login_required
class PageDeleteView(LoginRequiredMixin, AuthorOrStaffRequiredMixin, DeleteView):
    model = Page
    template_name = 'cms_app/page_confirm_delete.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'
    success_url = reverse_lazy('cms_app:page_list')

    def form_valid(self, form):
        messages.success(self.request, f"Page '{self.object.title}' deleted successfully!")
        return super().form_valid(form)

# --- Category Views ---
class CategoryListView(ListView):
    model = Category
    template_name = 'cms_app/category_list.html'
    context_object_name = 'categories'
    paginate_by = 10
    queryset = Category.objects.annotate(
        article_count=Count('article_content', distinct=True),
        page_count=Count('page_content', distinct=True)
    ).order_by('name')

class CategoryDetailView(DetailView):
    model = Category
    template_name = 'cms_app/category_detail.html'
    context_object_name = 'category'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        category = self.object
        # Filter content by category, ensuring only published content is shown
        context['articles'] = category.article_content.filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image').prefetch_related('tags').order_by('-published_at')
        context['pages'] = category.page_content.filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image').prefetch_related('tags').order_by('-published_at')
        return context

@login_required
class CategoryCreateView(LoginRequiredMixin, StaffRequiredMixin, CreateView):
    model = Category
    form_class = CategoryForm
    template_name = 'cms_app/category_form.html'
    success_url = reverse_lazy('cms_app:category_list')

    def form_valid(self, form):
        messages.success(self.request, 'Category created successfully!')
        return super().form_valid(form)

@login_required
class CategoryUpdateView(LoginRequiredMixin, StaffRequiredMixin, UpdateView):
    model = Category
    form_class = CategoryForm
    template_name = 'cms_app/category_form.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_success_url(self):
        messages.success(self.request, 'Category updated successfully!')
        return reverse_lazy('cms_app:category_detail', kwargs={'slug': self.object.slug})

@login_required
class CategoryDeleteView(LoginRequiredMixin, StaffRequiredMixin, DeleteView):
    model = Category
    template_name = 'cms_app/category_confirm_delete.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'
    success_url = reverse_lazy('cms_app:category_list')

    def form_valid(self, form):
        messages.success(self.request, f"Category '{self.object.name}' deleted successfully!")
        return super().form_valid(form)

# --- Tag Views ---
class TagListView(ListView):
    model = Tag
    template_name = 'cms_app/tag_list.html'
    context_object_name = 'tags'
    paginate_by = 10
    queryset = Tag.objects.annotate(
        article_count=Count('article_content', distinct=True),
        page_count=Count('page_content', distinct=True)
    ).order_by('name')

class TagDetailView(DetailView):
    model = Tag
    template_name = 'cms_app/tag_detail.html'
    context_object_name = 'tag'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        tag = self.object
        # Filter content by tag, ensuring only published content is shown
        context['articles'] = tag.article_content.filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image').prefetch_related('categories').order_by('-published_at')
        context['pages'] = tag.page_content.filter(status='published', published_at__lte=timezone.now()).select_related('author', 'featured_image').prefetch_related('categories').order_by('-published_at')
        return context

@login_required
class TagCreateView(LoginRequiredMixin, StaffRequiredMixin, CreateView):
    model = Tag
    form_class = TagForm
    template_name = 'cms_app/tag_form.html'
    success_url = reverse_lazy('cms_app:tag_list')

    def form_valid(self, form):
        messages.success(self.request, 'Tag created successfully!')
        return super().form_valid(form)

@login_required
class TagUpdateView(LoginRequiredMixin, StaffRequiredMixin, UpdateView):
    model = Tag
    form_class = TagForm
    template_name = 'cms_app/tag_form.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_success_url(self):
        messages.success(self.request, 'Tag updated successfully!')
        return reverse_lazy('cms_app:tag_detail', kwargs={'slug': self.object.slug})

@login_required
class TagDeleteView(LoginRequiredMixin, StaffRequiredMixin, DeleteView):
    model = Tag
    template_name = 'cms_app/tag_confirm_delete.html'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'
    success_url = reverse_lazy('cms_app:tag_list')

    def form_valid(self, form):
        messages.success(self.request, f"Tag '{self.object.name}' deleted successfully!")
        return super().form_valid(form)

# --- Media File Views ---
class MediaFileListView(LoginRequiredMixin, StaffRequiredMixin, ListView):
    model = MediaFile
    template_name = 'cms_app/media_list.html'
    context_object_name = 'media_files'
    paginate_by = 15

    def get_queryset(self):
        return super().get_queryset().select_related('uploaded_by')

@login_required
class MediaFileCreateView(LoginRequiredMixin, StaffRequiredMixin, CreateView):
    model = MediaFile
    form_class = MediaFileForm
    template_name = 'cms_app/media_form.html'
    success_url = reverse_lazy('cms_app:media_list')

    def form_valid(self, form):
        form.instance.uploaded_by = self.request.user
        messages.success(self.request, 'Media file uploaded successfully!')
        return super().form_valid(form)

@login_required
class MediaFileUpdateView(LoginRequiredMixin, StaffRequiredMixin, UpdateView):
    model = MediaFile
    form_class = MediaFileForm
    template_name = 'cms_app/media_form.html'
    pk_url_kwarg = 'pk'

    def get_success_url(self):
        messages.success(self.request, 'Media file updated successfully!')
        return reverse_lazy('cms_app:media_list')

@login_required
class MediaFileDeleteView(LoginRequiredMixin, StaffRequiredMixin, DeleteView):
    model = MediaFile
    template_name = 'cms_app/media_confirm_delete.html'
    pk_url_kwarg = 'pk'
    success_url = reverse_lazy('cms_app:media_list')

    def form_valid(self, form):
        messages.success(self.request, f"Media file '{self.object.title}' deleted successfully!")
        return super().form_valid(form)

# --- Comment Views (HTMX for AJAX actions) ---
@login_required
def post_comment(request, content_type_id, object_id):
    if request.method == 'POST' and request.htmx:
        content_type = get_object_or_404(ContentType, pk=content_type_id)
        content_object = content_type.get_object_for_this_type(pk=object_id)
        parent_id = request.POST.get('parent_comment_id')
        form = CommentForm(request.POST)

        if form.is_valid():
            comment = form.save(commit=False)
            comment.author = request.user
            comment.content_type = content_type
            comment.object_id = object_id
            if parent_id:
                comment.parent_comment = get_object_or_404(Comment, pk=parent_id)
            comment.save()
            messages.success(request, 'Your comment has been submitted for moderation.')
            # After posting, return the new comment (or a success message)
            # For simplicity, we'll re-render the comments section.
            return render(request, 'cms_app/partials/comment_section.html', {
                'content_object': content_object,
                'comments': content_object.comment_set.filter(approved=True, parent_comment__isnull=True).select_related('author').prefetch_related('replies__author'),
                'comment_form': CommentForm(),
                'hx_request': True, # Indicate this is an HTMX request for partial rendering
            })
        else:
            return render(request, 'cms_app/partials/comment_form_errors.html', {'form': form, 'hx_request': True})
    return redirect(request.META.get('HTTP_REFERER', '/')) # Redirect back if not HTMX

@login_required
@StaffRequiredMixin.as_view() # Ensure only staff can delete comments
def delete_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk)
    if request.method == 'DELETE' and request.htmx:
        comment.delete()
        messages.success(request, 'Comment deleted successfully.')
        return HttpResponse("") # HTMX expects an empty response for successful deletion
    return redirect(request.META.get('HTTP_REFERER', '/'))

from django.http import HttpResponse
from django.contrib.contenttypes.models import ContentType
```