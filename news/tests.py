from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import News


class NewsModelTest(TestCase):
    def test_news_creation(self):
        news = News.objects.create(
            title="Test News",
            description="This is a test description",
            author="Ayush",
            category="Technology"
        )
        self.assertEqual(news.title, "Test News")
        self.assertEqual(news.author, "Ayush")
        self.assertEqual(news.category, "Technology")


class NewsAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.news = News.objects.create(
            title="Initial News",
            description="Initial Description",
            author="Admin",
            category="General"
        )

    def test_get_news_list(self):
        response = self.client.get('/api/news/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_news(self):
        data = {
            "title": "New API News",
            "description": "Created through API",
            "author": "Ayush",
            "category": "Tech"
        }
        response = self.client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_news(self):
        data = {
            "title": "Updated News",
            "description": "Updated through API",
            "author": "Updated Author",
            "category": "Updated Category"
        }
        response = self.client.put(f'/api/news/{self.news.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_news(self):
        response = self.client.delete(f'/api/news/{self.news.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
