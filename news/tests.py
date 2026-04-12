from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import News


class NewsModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='modeluser', password='testpass123')

    def test_news_creation(self):
        news = News.objects.create(
            title="Test News",
            description="This is a test description",
            author=self.user,
            category="Technology",
        )
        self.assertEqual(news.title, "Test News")
        self.assertEqual(news.author, self.user)
        self.assertEqual(news.category, "Technology")


class NewsAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.other_user = User.objects.create_user(username='otheruser', password='testpass456')
        self.client.force_authenticate(user=self.user)
        # News owned by self.user so ownership tests are correct.
        # Created directly via ORM — bypasses serializer validation intentionally.
        self.news = News.objects.create(
            title="Initial News",
            description="Initial Description",
            author=self.user,
            category="General",
        )

    # ------------------------------------------------------------------ #
    # Basic read / create                                                  #
    # ------------------------------------------------------------------ #

    def test_get_news_list(self):
        response = self.client.get('/api/news/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_news(self):
        data = {
            "title": "New API News",
            "description": "Created through API",
            "category": "Technology",
        }
        response = self.client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------ #
    # Ownership assignment                                                  #
    # ------------------------------------------------------------------ #

    def test_create_news_assigns_owner(self):
        data = {
            "title": "Ownership Test",
            "description": "Testing owner assignment",
            "category": "Technology",
        }
        response = self.client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        news = News.objects.get(id=response.data['id'])
        self.assertEqual(news.author, self.user)

    # ------------------------------------------------------------------ #
    # Owner update / delete                                                 #
    # ------------------------------------------------------------------ #

    def test_update_news_as_owner(self):
        data = {
            "title": "Updated News",
            "description": "Updated through API",
            "category": "Sports",
        }
        response = self.client.put(f'/api/news/{self.news.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_news_as_owner(self):
        response = self.client.delete(f'/api/news/{self.news.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------ #
    # Non-owner forbidden on write                                          #
    # ------------------------------------------------------------------ #

    def test_update_news_as_non_owner_is_forbidden(self):
        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        data = {
            "title": "Unauthorized Update",
            "description": "Should be blocked",
            "category": "General",
        }
        response = other_client.put(f'/api/news/{self.news.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_news_as_non_owner_is_forbidden(self):
        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        response = other_client.delete(f'/api/news/{self.news.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------ #
    # Non-owner can read                                                    #
    # ------------------------------------------------------------------ #

    def test_non_owner_can_read_news_detail(self):
        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        response = other_client.get(f'/api/news/{self.news.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ------------------------------------------------------------------ #
    # Authentication wall                                                   #
    # ------------------------------------------------------------------ #

    def test_unauthenticated_request_is_rejected(self):
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get('/api/news/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ------------------------------------------------------------------ #
    # Validation — field-level                                              #
    # ------------------------------------------------------------------ #

    def test_title_too_short_is_rejected(self):
        data = {
            "title": "Hi",
            "description": "A long enough description",
            "category": "General",
        }
        response = self.client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_description_too_short_is_rejected(self):
        data = {
            "title": "Valid Title",
            "description": "Short",
            "category": "General",
        }
        response = self.client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_invalid_category_is_rejected(self):
        data = {
            "title": "Valid Title",
            "description": "A long enough description",
            "category": "InvalidCategory",
        }
        response = self.client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category', response.data)

    # ------------------------------------------------------------------ #
    # Pagination                                                            #
    # ------------------------------------------------------------------ #

    def test_list_response_is_paginated(self):
        response = self.client.get('/api/news/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)

    # ------------------------------------------------------------------ #
    # Filtering                                                             #
    # ------------------------------------------------------------------ #

    def test_filter_by_category_returns_matching_results(self):
        News.objects.create(
            title="Sports Article",
            description="A sports description here",
            author=self.user,
            category="Sports",
        )
        response = self.client.get('/api/news/?category=Sports')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['category'], 'Sports')

    def test_filter_by_category_excludes_non_matching(self):
        response = self.client.get('/api/news/?category=Politics')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    # ------------------------------------------------------------------ #
    # Search                                                                #
    # ------------------------------------------------------------------ #

    def test_search_by_title_keyword(self):
        response = self.client.get('/api/news/?search=Initial')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Initial News')

    def test_search_with_no_match_returns_empty(self):
        response = self.client.get('/api/news/?search=nonexistentkeyword')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
