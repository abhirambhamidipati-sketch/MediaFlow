import os
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Comment, News, UserProfile


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
        # Upgrade testuser to verified contributor so existing POST tests still pass.
        profile = self.user.profile
        profile.role = 'contributor'
        profile.verification_status = 'approved'
        profile.save()
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


class UserProfileTest(TestCase):
    """Tests for role-based user system and verification-gated news creation."""

    # ------------------------------------------------------------------ #
    # Signal / profile auto-creation                                       #
    # ------------------------------------------------------------------ #

    def test_new_user_profile_auto_created(self):
        user = User.objects.create_user(username='newuser', password='testpass123')
        self.assertTrue(hasattr(user, 'profile'))
        self.assertIsInstance(user.profile, UserProfile)

    def test_default_role_is_viewer(self):
        user = User.objects.create_user(username='vieweruser', password='testpass123')
        self.assertEqual(user.profile.role, 'viewer')

    # ------------------------------------------------------------------ #
    # Role / verification gates on POST /api/news/                         #
    # ------------------------------------------------------------------ #

    def test_viewer_cannot_create_news(self):
        """Default role=viewer → POST /api/news/ must return 403."""
        client = APIClient()
        viewer = User.objects.create_user(username='vieweronly', password='testpass123')
        # profile auto-created with role='viewer'
        client.force_authenticate(user=viewer)
        data = {
            "title": "Viewer Article",
            "description": "This should be rejected by IsVerifiedContributor",
            "category": "Technology",
        }
        response = client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_contributor_not_verified_cannot_create(self):
        """role=contributor but verification_status=pending → POST must return 403."""
        client = APIClient()
        unverified = User.objects.create_user(username='unverified', password='testpass123')
        profile = unverified.profile
        profile.role = 'contributor'
        profile.verification_status = 'pending'
        profile.save()
        client.force_authenticate(user=unverified)
        data = {
            "title": "Unverified Article",
            "description": "This should also be rejected",
            "category": "Technology",
        }
        response = client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_verified_contributor_can_create(self):
        """role=contributor AND verification_status=approved → POST must return 201."""
        client = APIClient()
        contributor = User.objects.create_user(username='verified', password='testpass123')
        profile = contributor.profile
        profile.role = 'contributor'
        profile.verification_status = 'approved'
        profile.save()
        client.force_authenticate(user=contributor)
        data = {
            "title": "Verified Article",
            "description": "This should be allowed through the gate",
            "category": "Technology",
        }
        response = client.post('/api/news/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Shared mock payload — represents one article returned by NewsAPI
# ---------------------------------------------------------------------------
_MOCK_EXTERNAL = [
    {
        'title': 'External Headline',
        'description': 'An article fetched from NewsAPI',
        'source': 'Mock News Source',
        'url': 'https://example.com/news/1',
        'image': 'https://example.com/img/1.jpg',
        'is_external': True,
    }
]


class ExternalNewsTest(TestCase):
    """Tests for the external news aggregation feature (Phase 4)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='extuser', password='testpass123')
        profile = self.user.profile
        profile.role = 'contributor'
        profile.verification_status = 'approved'
        profile.save()
        self.client.force_authenticate(user=self.user)
        # One internal article that exists in the DB throughout these tests.
        self.news = News.objects.create(
            title="Internal Article",
            description="An internal article stored in the database",
            author=self.user,
            category="Technology",
        )

    # ------------------------------------------------------------------ #
    # Service layer                                                         #
    # ------------------------------------------------------------------ #

    def test_external_fetch_returns_empty_without_api_key(self):
        """fetch_external_news() returns [] when NEWS_API_KEY is not set."""
        from news.services.external_news import fetch_external_news as _fetch
        with patch.dict(os.environ, {'NEWS_API_KEY': ''}, clear=False):
            result = _fetch()
        self.assertEqual(result, [])

    # ------------------------------------------------------------------ #
    # Combined feed — view layer                                            #
    # ------------------------------------------------------------------ #

    def test_combined_feed_includes_both_sources(self):
        """GET /api/news/ merges internal DB articles with external API articles."""
        with patch('news.views.fetch_external_news', return_value=_MOCK_EXTERNAL):
            response = self.client.get('/api/news/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)  # 1 internal + 1 external
        is_external_flags = [r['is_external'] for r in response.data['results']]
        self.assertIn(True, is_external_flags)   # external article present
        self.assertIn(False, is_external_flags)  # internal article present

    def test_combined_feed_resilient_to_external_failure(self):
        """GET /api/news/ still returns internal news when external fetch returns []."""
        with patch('news.views.fetch_external_news', return_value=[]):
            response = self.client.get('/api/news/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertFalse(response.data['results'][0]['is_external'])

    # ------------------------------------------------------------------ #
    # Source filtering                                                      #
    # ------------------------------------------------------------------ #

    def test_source_external_returns_only_external(self):
        """?source=external returns only external articles (no DB query)."""
        with patch('news.views.fetch_external_news', return_value=_MOCK_EXTERNAL):
            response = self.client.get('/api/news/?source=external')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertTrue(response.data['results'][0]['is_external'])

    def test_source_internal_returns_only_internal(self):
        """?source=internal returns only DB news in standard paginated format."""
        response = self.client.get('/api/news/?source=internal')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 1)
        # Standard serializer output — no is_external key on internal-only path
        self.assertNotIn('is_external', response.data['results'][0])


class EngagementTest(TestCase):
    """Tests for the Like, Bookmark, and Comment engagement systems (Phase 5)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='enguser', password='testpass123')
        self.other_user = User.objects.create_user(username='engother', password='testpass123')
        # Make primary user a verified contributor (needed for any POST /api/news/ calls)
        profile = self.user.profile
        profile.role = 'contributor'
        profile.verification_status = 'approved'
        profile.save()
        self.client.force_authenticate(user=self.user)
        # One internal article — created via ORM to bypass serializer validation
        self.news = News.objects.create(
            title="Engagement Test Article",
            description="Article used for engagement testing",
            author=self.user,
            category="Technology",
        )

    # ------------------------------------------------------------------ #
    # Likes                                                                 #
    # ------------------------------------------------------------------ #

    def test_like_news_returns_201(self):
        """First like on an article returns 201 with liked=True."""
        response = self.client.post(f'/api/news/{self.news.id}/like/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['liked'])
        self.assertEqual(response.data['likes_count'], 1)

    def test_like_same_news_twice_toggles_off(self):
        """Second POST to like endpoint removes the like (toggle off → 200)."""
        self.client.post(f'/api/news/{self.news.id}/like/')
        response = self.client.post(f'/api/news/{self.news.id}/like/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['liked'])
        self.assertEqual(response.data['likes_count'], 0)

    def test_unlike_via_delete_works(self):
        """DELETE /api/news/<pk>/like/ removes an existing like."""
        self.client.post(f'/api/news/{self.news.id}/like/')
        response = self.client.delete(f'/api/news/{self.news.id}/like/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['liked'])

    def test_like_nonexistent_news_returns_404(self):
        """Liking a non-existent (or external) news ID returns 404."""
        response = self.client.post('/api/news/99999/like/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------ #
    # Bookmarks                                                             #
    # ------------------------------------------------------------------ #

    def test_bookmark_news_returns_201(self):
        """First bookmark on an article returns 201 with bookmarked=True."""
        response = self.client.post(f'/api/news/{self.news.id}/bookmark/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['bookmarked'])

    def test_bookmark_toggle_removes_bookmark(self):
        """Second POST to bookmark endpoint removes it (toggle off → 200)."""
        self.client.post(f'/api/news/{self.news.id}/bookmark/')
        response = self.client.post(f'/api/news/{self.news.id}/bookmark/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['bookmarked'])

    # ------------------------------------------------------------------ #
    # Comments                                                              #
    # ------------------------------------------------------------------ #

    def test_add_comment_returns_201(self):
        """Authenticated user can post a comment; returns 201 with content."""
        response = self.client.post(
            f'/api/news/{self.news.id}/comments/',
            {'content': 'Great article!'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['content'], 'Great article!')
        self.assertEqual(response.data['username'], self.user.username)

    def test_fetch_comments_returns_200_with_count(self):
        """GET /api/news/<pk>/comments/ returns paginated list of comments."""
        Comment.objects.create(user=self.user, news=self.news, content='First comment')
        response = self.client.get(f'/api/news/{self.news.id}/comments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 1)

    def test_delete_own_comment_returns_204(self):
        """Owner of a comment can delete it; returns 204."""
        comment = Comment.objects.create(
            user=self.user, news=self.news, content='Delete me'
        )
        response = self.client.delete(f'/api/comments/{comment.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_others_comment_is_forbidden(self):
        """Deleting another user's comment returns 403."""
        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        comment = Comment.objects.create(
            user=self.user, news=self.news, content='Not yours to delete'
        )
        response = other_client.delete(f'/api/comments/{comment.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------ #
    # Engagement fields on news responses                                   #
    # ------------------------------------------------------------------ #

    def test_news_detail_includes_engagement_fields(self):
        """GET /api/news/<pk>/ response includes all four engagement fields."""
        response = self.client.get(f'/api/news/{self.news.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ('likes_count', 'comments_count', 'is_liked', 'is_bookmarked'):
            self.assertIn(field, response.data)

    def test_engagement_counts_reflect_actions(self):
        """likes_count and comments_count update after actual engagement."""
        self.client.post(f'/api/news/{self.news.id}/like/')
        self.client.post(
            f'/api/news/{self.news.id}/comments/',
            {'content': 'Counting this comment'},
        )
        response = self.client.get(f'/api/news/{self.news.id}/')
        self.assertEqual(response.data['likes_count'], 1)
        self.assertEqual(response.data['comments_count'], 1)
        self.assertTrue(response.data['is_liked'])
        self.assertFalse(response.data['is_bookmarked'])
