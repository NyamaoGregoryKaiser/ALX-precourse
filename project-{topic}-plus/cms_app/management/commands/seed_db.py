from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from cms_app.models import Category, Tag, Article, Page, Comment, MediaFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
import os
import random
import logging
from PIL import Image

logger = logging.getLogger(__name__)

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial data for development and testing.'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of articles/pages to create.')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding.')

    @transaction.atomic
    def handle(self, *args, **options):
        count = options['count']
        clear = options['clear']

        if clear:
            self.stdout.write(self.style.WARNING("Clearing existing data..."))
            Comment.objects.all().delete()
            Article.objects.all().delete()
            Page.objects.all().delete()
            MediaFile.objects.all().delete()
            Tag.objects.all().delete()
            Category.objects.all().delete()
            User.objects.filter(is_superuser=False, username__in=['testuser']).delete() # Only delete non-superuser test users
            self.stdout.write(self.style.SUCCESS("Data cleared."))

        self.stdout.write(self.style.SUCCESS(f"Seeding {count} items of data..."))

        # Create a superuser if it doesn't exist
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')
            self.stdout.write(self.style.SUCCESS(f"Created superuser: {admin_user.username}"))
        else:
            admin_user = User.objects.get(username='admin')
            self.stdout.write(self.style.SUCCESS(f"Superuser '{admin_user.username}' already exists."))

        # Create a regular user
        if not User.objects.filter(username='testuser').exists():
            test_user = User.objects.create_user('testuser', 'test@example.com', 'testpassword')
            self.stdout.write(self.style.SUCCESS(f"Created regular user: {test_user.username}"))
        else:
            test_user = User.objects.get(username='testuser')
            self.stdout.write(self.style.SUCCESS(f"Regular user '{test_user.username}' already exists."))

        users = [admin_user, test_user]

        # Create Categories
        categories = ['Technology', 'Science', 'Nature', 'Travel', 'Food', 'Health', 'Sports', 'Education']
        for cat_name in categories:
            Category.objects.get_or_create(name=cat_name)
        categories = list(Category.objects.all())
        self.stdout.write(self.style.SUCCESS(f"Created {len(categories)} categories."))

        # Create Tags
        tags = ['Python', 'Django', 'WebDev', 'AI', 'MachineLearning', 'DataScience', 'Adventure', 'Cooking', 'Fitness']
        for tag_name in tags:
            Tag.objects.get_or_create(name=tag_name)
        tags = list(Tag.objects.all())
        self.stdout.write(self.style.SUCCESS(f"Created {len(tags)} tags."))

        # Create Media Files (dummy images)
        # Create a simple dummy image programmatically
        media_files = []
        for i in range(min(count, 5)): # Create up to 5 dummy media files
            image_name = f'dummy_image_{i+1}.jpg'
            img = Image.new('RGB', (600, 400), color = (random.randint(0,255), random.randint(0,255), random.randint(0,255)))
            
            # Save image to a BytesIO object
            from io import BytesIO
            img_io = BytesIO()
            img.save(img_io, format='JPEG')
            image_file = SimpleUploadedFile(name=image_name, content=img_io.getvalue(), content_type='image/jpeg')

            media = MediaFile.objects.create(
                title=f'Dummy Image {i+1}',
                file=image_file,
                media_type='image',
                uploaded_by=random.choice(users),
                description=f'A placeholder image for content {i+1}.'
            )
            media_files.append(media)
        self.stdout.write(self.style.SUCCESS(f"Created {len(media_files)} media files."))

        # Create Articles
        article_titles = [
            "The Future of AI in Content Creation", "Exploring Remote Work Destinations",
            "A Beginner's Guide to Django Development", "Healthy Eating Habits for Busy Professionals",
            "Understanding Climate Change: A Scientific Perspective", "Mastering Python for Data Science",
            "The Art of Travel Photography", "Innovative Solutions for Sustainable Living"
        ]
        articles = []
        for i in range(count):
            title = random.choice(article_titles) + f" (Seed {i+1})"
            content = f"""
            ## {title}

            This is a generated article content for demonstration purposes. It includes multiple paragraphs
            to simulate real-world text.

            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
            labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
            laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
            voluptate velit esse cillum dolore eu fugiat nulla pariatur.

            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.

            ### Key Takeaways

            *   Point 1: Emphasize the importance of continuous learning.
            *   Point 2: Highlight the benefits of adopting new technologies.
            *   Point 3: Encourage critical thinking and problem-solving.

            This article was seeded on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}.
            """
            article = Article.objects.create(
                title=title,
                author=random.choice(users),
                excerpt=content[:200] + "...",
                content=content,
                status=random.choice(['published', 'draft', 'archived']),
                published_at=timezone.now() - timezone.timedelta(days=random.randint(1, 365)),
                featured_image=random.choice(media_files) if media_files else None
            )
            article.categories.set(random.sample(categories, random.randint(1, min(3, len(categories)))))
            article.tags.set(random.sample(tags, random.randint(1, min(4, len(tags)))))
            articles.append(article)
        self.stdout.write(self.style.SUCCESS(f"Created {len(articles)} articles."))

        # Create Pages
        page_titles = [
            "About Us", "Contact", "Privacy Policy", "Terms of Service",
            "Our Mission", "Team", "Services"
        ]
        pages = []
        for i in range(min(count, 5)): # Create up to 5 dummy pages
            title = random.choice(page_titles) + f" (Seed {i+1})"
            content = f"""
            # {title}

            This is a generated page content.

            Our vision is to build a comprehensive and user-friendly platform that empowers
            individuals and businesses to manage their digital content effectively.

            Feel free to explore our services and learn more about what we offer.
            """
            page = Page.objects.create(
                title=title,
                author=random.choice(users),
                content=content,
                status=random.choice(['published', 'draft']),
                published_at=timezone.now() - timezone.timedelta(days=random.randint(1, 100)),
                featured_image=random.choice(media_files) if media_files else None
            )
            page.categories.set(random.sample(categories, random.randint(0, min(2, len(categories)))))
            page.tags.set(random.sample(tags, random.randint(0, min(3, len(tags)))))
            pages.append(page)

        # Set parent pages for some pages
        if len(pages) > 1:
            for i in range(1, len(pages)):
                if random.random() < 0.5: # 50% chance to have a parent
                    pages[i].parent_page = random.choice(pages[:i])
                    pages[i].save()
        self.stdout.write(self.style.SUCCESS(f"Created {len(pages)} pages."))

        # Create Comments
        for _ in range(count * 2): # Create twice as many comments as content items
            content_type_choice = random.choice([Article, Page])
            if content_type_choice == Article and articles:
                content_object = random.choice(articles)
            elif content_type_choice == Page and pages:
                content_object = random.choice(pages)
            else:
                continue

            parent_comment = None
            if random.random() < 0.3: # 30% chance to be a reply
                existing_comments = Comment.objects.filter(
                    content_type=ContentType.objects.get_for_model(content_object),
                    object_id=content_object.id
                )
                if existing_comments.exists():
                    parent_comment = random.choice(list(existing_comments))

            Comment.objects.create(
                content_object=content_object,
                author=random.choice(users),
                body=f"This is a sample comment on '{content_object.title}'. " +
                     "It's a really insightful piece! Thanks for sharing.",
                approved=random.choice([True, False]),
                parent_comment=parent_comment
            )
        self.stdout.write(self.style.SUCCESS(f"Created numerous comments."))

        self.stdout.write(self.style.SUCCESS("Database seeding complete!"))
```