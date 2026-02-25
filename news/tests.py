from django.test import TestCase
from .models import News

class NewsModelTest(TestCase):
    def test_news_creation(self):
        news = News.objects.create(
            title="Test News",
            description="This is a test description"
        )
        self.assertEqual(news.title, "Test News")