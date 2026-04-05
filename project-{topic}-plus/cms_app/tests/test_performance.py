import time
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from cms_app.models import Article, Category, Tag
from django.db import connection

User = get_user_model()

class PerformanceTests(TestCase):
    NUM_ARTICLES = 100
    NUM_CATEGORIES = 10
    NUM_TAGS = 20

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='perfuser', email='perf@example.com', password='password123')

        cls.categories = [Category.objects.create(name=f'Category {i}') for i in range(cls.NUM_CATEGORIES)]
        cls.tags = [Tag.objects.create(name=f'Tag {i}') for i in range(cls.NUM_TAGS)]

        cls.articles = []
        for i in range(cls.NUM_ARTICLES):
            article = Article.objects.create(
                title=f'Performance Article {i}',
                author=cls.user,
                excerpt=f'Excerpt for article {i}',
                content=f'Content for article {i}. This is a long piece of text to simulate a real article. ' * 10,
                status='published',
                published_at=timezone.now()
            )
            article.categories.set([cls.categories[i % cls.NUM_CATEGORIES]])
            article.tags.set([cls.tags[i % cls.NUM_TAGS], cls.tags[(i + 1) % cls.NUM_TAGS]])
            cls.articles.append(article)

    def test_article_list_query_performance(self):
        # Test N+1 problem without optimization
        start_time = time.time()
        for article in Article.objects.all():
            _ = article.author.username
            _ = [c.name for c in article.categories.all()]
            _ = [t.name for t in article.tags.all()]
        end_time_unoptimized = time.time()
        self.stdout.write(f"\nUnoptimized Article List Loop: {end_time_unoptimized - start_time:.4f} seconds")

        # Test N+1 problem with optimization
        start_time = time.time()
        for article in Article.objects.select_related('author').prefetch_related('categories', 'tags'):
            _ = article.author.username
            _ = [c.name for c in article.categories.all()]
            _ = [t.name for t in article.tags.all()]
        end_time_optimized = time.time()
        self.stdout.write(f"Optimized Article List Loop (select_related, prefetch_related): {end_time_optimized - start_time:.4f} seconds")

        # Assert that the optimized version is significantly faster (e.g., 5x)
        # The exact ratio depends on setup, but it should be a clear improvement.
        # This is a heuristic assertion; actual performance testing uses more robust tools.
        self.assertLess(end_time_optimized, end_time_unoptimized / 2, "Optimized query should be much faster.")

    def test_search_query_performance(self):
        query = "article" # A common word that will match many articles

        # Measure query without optimization (if search logic was in Python loop)
        # This test primarily focuses on ORM-level query efficiency
        
        # Use Django's query logger to count queries
        with self.assertNumQueries(2): # 1 for articles, 1 for pages (combined into one test)
            start_time = time.time()
            articles = Article.objects.filter(
                Q(title__icontains=query) |
                Q(content__icontains=query) |
                Q(excerpt__icontains=query) |
                Q(author__username__icontains=query)
            ).filter(status='published', published_at__lte=timezone.now()).distinct().select_related('author').prefetch_related('categories', 'tags')

            # Simulate the view's query combination
            results = list(articles)
            end_time = time.time()
            self.stdout.write(f"Search Query for '{query}' (ORM execution): {end_time - start_time:.4f} seconds with {len(connection.queries)} queries.")

            # Ensure we found a reasonable number of results
            self.assertGreater(len(results), 0)

from django.db.models import Q
```