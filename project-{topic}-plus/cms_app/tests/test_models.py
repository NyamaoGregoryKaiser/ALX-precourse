from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.utils import IntegrityError
from datetime import timedelta
from cms_app.models import Category, Tag, MediaFile, Article, Page, Comment
from PIL import Image
from io import BytesIO

User = get_user_model()

class CMSModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password123')
        self.staff_user = User.objects.create_user(username='staffuser', email='staff@example.com', password='password123', is_staff=True)

        self.category1 = Category.objects.create(name='Technology', description='Tech related content')
        self.category2 = Category.objects.create(name='Science')

        self.tag1 = Tag.objects.create(name='Python')
        self.tag2 = Tag.objects.create(name='Django')

        # Create a dummy image for MediaFile
        image_name = 'test_image.jpg'
        img = Image.new('RGB', (100, 100), color='red')
        img_io = BytesIO()
        img.save(img_io, format='JPEG')
        self.uploaded_image = SimpleUploadedFile(name=image_name, content=img_io.getvalue(), content_type='image/jpeg')

        self.media_file = MediaFile.objects.create(
            title='Test Image',
            file=self.uploaded_image,
            media_type='image',
            uploaded_by=self.staff_user
        )

        self.article = Article.objects.create(
            title='Test Article',
            author=self.user,
            excerpt='This is a test excerpt.',
            content='This is the full content of the test article.',
            status='draft',
            published_at=None,
            featured_image=self.media_file
        )
        self.article.categories.add(self.category1)
        self.article.tags.add(self.tag1, self.tag2)

        self.page = Page.objects.create(
            title='Test Page',
            author=self.user,
            content='Content for the test page.',
            status='published',
            published_at=timezone.now() - timedelta(days=1)
        )

    def test_category_creation(self):
        self.assertEqual(self.category1.name, 'Technology')
        self.assertEqual(self.category1.slug, 'technology')
        self.assertTrue(self.category1.created_at)
        self.assertTrue(self.category1.updated_at)

    def test_category_slug_uniqueness(self):
        with self.assertRaises(IntegrityError):
            Category.objects.create(name='Technology') # Should fail due to unique name/slug

        new_category = Category.objects.create(name='Technology Article') # Different name, different slug
        self.assertEqual(new_category.slug, 'technology-article')

    def test_tag_creation(self):
        self.assertEqual(self.tag1.name, 'Python')
        self.assertEqual(self.tag1.slug, 'python')

    def test_media_file_creation(self):
        self.assertEqual(self.media_file.title, 'Test Image')
        self.assertTrue(self.media_file.file.name.endswith('test_image.jpg'))
        self.assertEqual(self.media_file.uploaded_by, self.staff_user)
        self.assertEqual(self.media_file.file_url, self.media_file.file.url)

    def test_article_creation(self):
        self.assertEqual(self.article.title, 'Test Article')
        self.assertEqual(self.article.author, self.user)
        self.assertEqual(self.article.status, 'draft')
        self.assertFalse(self.article.is_published())
        self.assertEqual(self.article.word_count, 10) # "This is the full content of the test article."
        self.assertIn(self.category1, self.article.categories.all())
        self.assertIn(self.tag1, self.article.tags.all())
        self.assertEqual(self.article.featured_image, self.media_file)

    def test_article_publish(self):
        self.article.publish()
        self.assertEqual(self.article.status, 'published')
        self.assertTrue(self.article.published_at <= timezone.now())
        self.assertTrue(self.article.is_published())

    def test_article_unpublish(self):
        self.article.publish() # First publish it
        self.article.unpublish()
        self.assertEqual(self.article.status, 'draft')
        self.assertFalse(self.article.is_published())

    def test_page_creation(self):
        self.assertEqual(self.page.title, 'Test Page')
        self.assertEqual(self.page.author, self.user)
        self.assertEqual(self.page.status, 'published')
        self.assertTrue(self.page.is_published())

    def test_comment_creation(self):
        comment = Comment.objects.create(
            content_object=self.article,
            author=self.user,
            body='First comment on the article.',
            approved=False
        )
        self.assertEqual(comment.content_object, self.article)
        self.assertEqual(comment.author, self.user)
        self.assertFalse(comment.approved)
        self.assertEqual(self.article.comment_set.count(), 1)

    def test_comment_reply(self):
        parent_comment = Comment.objects.create(
            content_object=self.article,
            author=self.user,
            body='Parent comment.',
            approved=True
        )
        reply_comment = Comment.objects.create(
            content_object=self.article,
            author=self.staff_user,
            body='Reply to parent.',
            approved=True,
            parent_comment=parent_comment
        )
        self.assertEqual(reply_comment.parent_comment, parent_comment)
        self.assertEqual(parent_comment.replies.count(), 1)
        self.assertIn(reply_comment, parent_comment.replies.all())

    def test_comment_approve_unapprove(self):
        comment = Comment.objects.create(
            content_object=self.article,
            author=self.user,
            body='Unapproved comment.',
            approved=False
        )
        self.assertFalse(comment.approved)
        comment.approve()
        self.assertTrue(comment.approved)
        comment.unapprove()
        self.assertFalse(comment.approved)

    def test_abstract_model_timestamping(self):
        # All models inherit from TimestampedModel
        self.assertTrue(self.article.created_at)
        self.assertTrue(self.article.updated_at)
        old_updated_at = self.article.updated_at
        self.article.title = "Updated Title"
        self.article.save()
        self.assertGreater(self.article.updated_at, old_updated_at)
```