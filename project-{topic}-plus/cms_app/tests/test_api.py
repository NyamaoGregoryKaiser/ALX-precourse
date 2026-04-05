from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from cms_app.models import Article, Page, Category, Tag, MediaFile, Comment
from PIL import Image
from io import BytesIO

User = get_user_model()

class CMSAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password123')
        self.staff_user = User.objects.create_user(username='staffuser', email='staff@example.com', password='password123', is_staff=True)
        self.admin_user = User.objects.create_superuser(username='admin', email='admin@example.com', password='adminpassword')

        # Get JWT tokens
        self.user_token = self.get_jwt_token(self.user.username, 'password123')
        self.staff_token = self.get_jwt_token(self.staff_user.username, 'password123')
        self.admin_token = self.get_jwt_token(self.admin_user.username, 'adminpassword')

        self.category = Category.objects.create(name='API Testing', slug='api-testing')
        self.tag = Tag.objects.create(name='APITag', slug='api-tag')

        image_name = 'api_test_image.jpg'
        img = Image.new('RGB', (100, 100), color='green')
        img_io = BytesIO()
        img.save(img_io, format='JPEG')
        uploaded_image = SimpleUploadedFile(name=image_name, content=img_io.getvalue(), content_type='image/jpeg')

        self.media_file = MediaFile.objects.create(
            title='API Test Image',
            file=uploaded_image,
            media_type='image',
            uploaded_by=self.staff_user
        )

        self.article = Article.objects.create(
            title='API Article',
            author=self.user,
            excerpt='API excerpt.',
            content='API content.',
            status='published',
            published_at=timezone.now() - timedelta(days=1),
            featured_image=self.media_file
        )
        self.article.categories.add(self.category)
        self.article.tags.add(self.tag)

        self.page = Page.objects.create(
            title='API Page',
            author=self.user,
            content='API page content.',
            status='published',
            published_at=timezone.now() - timedelta(days=1)
        )

        self.comment = Comment.objects.create(
            content_object=self.article,
            author=self.user,
            body='API comment',
            approved=True
        )

    def get_jwt_token(self, username, password):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {'username': username, 'password': password}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access']

    def authenticate_client(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # --- Category API Tests ---
    def test_list_categories(self):
        url = reverse('category-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, self.category.name)

    def test_create_category_staff(self):
        self.authenticate_client(self.staff_token)
        url = reverse('category-list')
        data = {'name': 'New APICategory', 'description': 'Description for new category'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(name='New APICategory').exists())

    def test_create_category_non_staff(self):
        self.authenticate_client(self.user_token)
        url = reverse('category-list')
        data = {'name': 'Unauthorized Category', 'description': 'Description'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Article API Tests ---
    def test_list_articles(self):
        url = reverse('article-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, self.article.title)

    def test_create_article(self):
        self.authenticate_client(self.user_token)
        url = reverse('article-list')
        data = {
            'title': 'New API Article',
            'excerpt': 'New API excerpt.',
            'content': 'New API content.',
            'status': 'draft',
            'category_ids': [self.category.id],
            'tag_ids': [self.tag.id]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Article.objects.filter(title='New API Article').exists())

    def test_update_article_owner(self):
        self.authenticate_client(self.user_token)
        url = reverse('article-detail', kwargs={'slug': self.article.slug})
        data = {'title': 'Updated API Article Title'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.article.refresh_from_db()
        self.assertEqual(self.article.title, 'Updated API Article Title')

    def test_update_article_non_owner(self):
        # Create another user and try to update self.article
        other_user = User.objects.create_user(username='otheruser', email='other@example.com', password='password123')
        other_token = self.get_jwt_token(other_user.username, 'password123')
        self.authenticate_client(other_token)
        url = reverse('article-detail', kwargs={'slug': self.article.slug})
        data = {'title': 'Unauthorized Update'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_article_owner(self):
        self.authenticate_client(self.user_token)
        url = reverse('article-detail', kwargs={'slug': self.article.slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Article.objects.filter(pk=self.article.pk).exists())

    def test_publish_article(self):
        # Create a draft article for testing publish action
        draft_article = Article.objects.create(
            title='Draft Article for Publish',
            author=self.user,
            content='Draft content.',
            status='draft'
        )
        self.authenticate_client(self.user_token)
        url = reverse('article-publish', kwargs={'slug': draft_article.slug})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        draft_article.refresh_from_db()
        self.assertEqual(draft_article.status, 'published')
        self.assertIsNotNone(draft_article.published_at)

    # --- Comment API Tests ---
    def test_list_comments_for_article(self):
        article_content_type = ContentType.objects.get_for_model(self.article)
        url = reverse('content-comment-list-create', kwargs={
            'content_type_id': article_content_type.id,
            'object_id': self.article.id
        })
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, self.comment.body)

    def test_create_comment_authenticated(self):
        self.authenticate_client(self.user_token)
        article_content_type = ContentType.objects.get_for_model(self.article)
        url = reverse('content-comment-list-create', kwargs={
            'content_type_id': article_content_type.id,
            'object_id': self.article.id
        })
        data = {'body': 'A new API comment.'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Comment.objects.filter(body='A new API comment.').exists())
        # Newly created comments are 'approved=False' by default in the model,
        # so they won't show up in public list without admin approval.

    def test_update_comment_owner(self):
        self.authenticate_client(self.user_token)
        url = reverse('comment-detail', kwargs={'pk': self.comment.pk})
        data = {'body': 'Updated API comment.'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.body, 'Updated API comment.')

    def test_approve_comment_admin(self):
        unapproved_comment = Comment.objects.create(
            content_object=self.article,
            author=self.user,
            body='This comment needs approval.',
            approved=False
        )
        self.authenticate_client(self.admin_token)
        url = reverse('comment-approve', kwargs={'pk': unapproved_comment.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unapproved_comment.refresh_from_db()
        self.assertTrue(unapproved_comment.approved)
```