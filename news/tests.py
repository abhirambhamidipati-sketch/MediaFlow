from django.test import TestCase
from .models import News

class NewsModelTest(TestCase):
    def setUp(self):
        self.news = News.objects.create(
            title="Test News",
            description="Test Description"
        )

    def test_news_creation(self):
        self.assertEqual(self.news.title, "Test News")
        self.assertEqual(self.news.description, "Test Description")