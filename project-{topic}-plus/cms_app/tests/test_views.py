from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from cms_app.models import Article, Page, Category, Tag, MediaFile, Comment
from cms_app.forms import ArticleForm, PageForm, CommentForm
from PIL import Image
from io import BytesIO

User = get_user_model()

class CMSViewsTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password123')
        self.staff_user = User.objects.create_user(username='staffuser', email='staff@example.com', password='password123', is_staff=True)
        self.admin_user = User.objects.create_superuser(username='admin', email='admin@example.com', password='adminpassword')

        self.category = Category.objects.create(name='Testing', slug='testing')
        self.tag = Tag.objects.create(name='TestTag', slug='testtag')

        # Create a dummy image for MediaFile
        image_name = 'view_test_image.jpg'
        img = Image.new('RGB', (100, 100), color='blue')
        img_io = BytesIO()
        img.save(img_io, format='JPEG')
        uploaded_image = SimpleUploadedFile(name=image_name, content=img_io.getvalue(), content_type='image/jpeg')

        self.media_file = MediaFile.objects.create(
            title='View Test Image',
            file=uploaded_image,
            media_type='image',
            uploaded_by=self.staff_user
        )

        self.article1 = Article.objects.create(
            title='Published Article 1',
            author=self.user,
            excerpt='Excerpt 1',
            content='Content for published article 1.',
            status='published',
            published_at=timezone.now() - timedelta(days=2),
            featured_image=self.media_file
        )
        self.article1.categories.add(self.category)
        self.article1.tags.add(self.tag)

        self.article2 = Article.objects.create(
            title='Draft Article 2',
            author=self.user,
            excerpt='Excerpt 2',
            content='Content for draft article 2.',
            status='draft',
            published_at=None
        )

        self.page1 = Page.objects.create(
            title='Published Page 1',
            author=self.user,
            content='Content for published page 1.',
            status='published',
            published_at=timezone.now() - timedelta(days=1)
        )

        self.comment1 = Comment.objects.create(
            content_object=self.article1,
            author=self.user,
            body='First comment on article 1',
            approved=True
        )

        self.home_url = reverse('cms_app:home')
        self.article_list_url = reverse('cms_app:article_list')
        self.article_detail_url = reverse('cms_app:article_detail', kwargs={'slug': self.article1.slug})
        self.article_create_url = reverse('cms_app:article_create')
        self.article_update_url = reverse('cms_app:article_update', kwargs={'slug': self.article1.slug})
        self.article_delete_url = reverse('cms_app:article_delete', kwargs={'slug': self.article1.slug})

        self.page_list_url = reverse('cms_app:page_list')
        self.page_detail_url = reverse('cms_app:page_detail', kwargs={'slug': self.page1.slug})

        self.category_list_url = reverse('cms_app:category_list')
        self.category_detail_url = reverse('cms_app:category_detail', kwargs={'slug': self.category.slug})

        self.media_list_url = reverse('cms_app:media_list')

    # --- Home & Search Views ---
    def test_home_view(self):
        response = self.client.get(self.home_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.article1.title)
        self.assertNotContains(response, self.article2.title) # Draft article should not appear

    def test_search_view(self):
        response = self.client.get(reverse('cms_app:search'), {'q': 'published'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.article1.title)
        self.assertContains(response, self.page1.title)
        self.assertNotContains(response, self.article2.title)

        response = self.client.get(reverse('cms_app:search'), {'q': 'nonexistent'})
        self.assertNotContains(response, self.article1.title)

    # --- Article Views ---
    def test_article_list_view(self):
        response = self.client.get(self.article_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.article1.title)
        self.assertNotContains(response, self.article2.title)

    def test_article_detail_view(self):
        response = self.client.get(self.article_detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.article1.title)
        self.assertContains(response, self.article1.content)
        self.assertContains(response, self.comment1.body) # Approved comment should be visible

        # Draft article should return 404 for public access
        response = self.client.get(reverse('cms_app:article_detail', kwargs={'slug': self.article2.slug}))
        self.assertEqual(response.status_code, 404)

    def test_article_create_view_get(self):
        self.client.login(username='testuser', password='password123')
        response = self.client.get(self.article_create_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.context['form'], ArticleForm)

    def test_article_create_view_post(self):
        self.client.login(username='testuser', password='password123')
        data = {
            'title': 'New Test Article',
            'excerpt': 'New excerpt',
            'content': 'New content',
            'status': 'draft',
            'categories': [self.category.id],
            'tags': [self.tag.id]
        }
        response = self.client.post(self.article_create_url, data)
        self.assertEqual(response.status_code, 302) # Redirects on success
        self.assertTrue(Article.objects.filter(title='New Test Article').exists())

    def test_article_update_view_owner(self):
        self.client.login(username='testuser', password='password123')
        data = {
            'title': 'Updated Article Title',
            'excerpt': 'Updated excerpt',
            'content': 'Updated content.',
            'status': 'published',
            'published_at': timezone.now(),
            'categories': [self.category.id],
            'tags': [self.tag.id]
        }
        response = self.client.post(self.article_update_url, data)
        self.assertEqual(response.status_code, 302)
        self.article1.refresh_from_db()
        self.assertEqual(self.article1.title, 'Updated Article Title')

    def test_article_update_view_non_owner(self):
        # Log in as a different user
        User.objects.create_user(username='otheruser', email='other@example.com', password='password123')
        self.client.login(username='otheruser', password='password123')
        data = {
            'title': 'Attempt to Update',
            'excerpt': 'Attempt excerpt',
            'content': 'Attempt content.',
            'status': 'published',
            'published_at': timezone.now(),
            'categories': [self.category.id],
            'tags': [self.tag.id]
        }
        response = self.client.post(self.article_update_url, data)
        self.assertEqual(response.status_code, 403) # Forbidden

    def test_article_delete_view_owner(self):
        self.client.login(username='testuser', password='password123')
        response = self.client.post(self.article_delete_url)
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Article.objects.filter(pk=self.article1.pk).exists())

    # --- Page Views ---
    def test_page_list_view(self):
        response = self.client.get(self.page_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.page1.title)

    def test_page_detail_view(self):
        response = self.client.get(self.page_detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.page1.title)
        self.assertContains(response, self.page1.content)

    # --- Category Views ---
    def test_category_list_view(self):
        response = self.client.get(self.category_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.category.name)

    def test_category_detail_view(self):
        response = self.client.get(self.category_detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.category.name)
        self.assertContains(response, self.article1.title) # Article in this category should show

    def test_category_create_view_staff(self):
        self.client.login(username='staffuser', password='password123')
        data = {'name': 'New Category', 'slug': 'new-category', 'description': 'Description'}
        response = self.client.post(reverse('cms_app:category_create'), data)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Category.objects.filter(name='New Category').exists())

    def test_category_create_view_non_staff(self):
        self.client.login(username='testuser', password='password123')
        data = {'name': 'Unauthorized Category', 'slug': 'unauthorized', 'description': 'Description'}
        response = self.client.post(reverse('cms_app:category_create'), data)
        self.assertEqual(response.status_code, 403) # Forbidden

    # --- Media File Views ---
    def test_media_list_view_staff(self):
        self.client.login(username='staffuser', password='password123')
        response = self.client.get(self.media_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.media_file.title)

    def test_media_list_view_non_staff(self):
        self.client.login(username='testuser', password='password123')
        response = self.client.get(self.media_list_url)
        self.assertEqual(response.status_code, 403) # Forbidden

    # --- Comment Views (HTMX) ---
    def test_post_comment_htmx(self):
        self.client.login(username='testuser', password='password123')
        article_content_type = ContentType.objects.get_for_model(self.article1)
        url = reverse('cms_app:post_comment', kwargs={
            'content_type_id': article_content_type.id,
            'object_id': self.article1.id
        })
        data = {'body': 'A new comment from HTMX.'}
        headers = {'HX-Request': 'true'} # Simulate HTMX request

        response = self.client.post(url, data, **headers)
        self.assertEqual(response.status_code, 200) # HTMX expects 200 for partial content
        self.assertContains(response, 'A new comment from HTMX.')
        self.assertTrue(Comment.objects.filter(body='A new comment from HTMX.').exists())

    def test_delete_comment_htmx_staff(self):
        self.client.login(username='staffuser', password='password123')
        url = reverse('cms_app:delete_comment', kwargs={'pk': self.comment1.pk})
        headers = {'HX-Request': 'true'}

        response = self.client.delete(url, **headers)
        self.assertEqual(response.status_code, 200) # HTMX expects 200 for successful deletion
        self.assertFalse(Comment.objects.filter(pk=self.comment1.pk).exists())

    def test_delete_comment_htmx_non_staff(self):
        self.client.login(username='testuser', password='password123')
        url = reverse('cms_app:delete_comment', kwargs={'pk': self.comment1.pk})
        headers = {'HX-Request': 'true'}

        response = self.client.delete(url, **headers)
        self.assertEqual(response.status_code, 403) # Forbidden

```