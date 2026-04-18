import os
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Comment, Like, News, UserProfile


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
        # Prevent real external API calls from inflating counts in these tests.
        self._ext_patch = patch('news.views.fetch_external_news', return_value=[])
        self._ext_patch.start()

    def tearDown(self):
        self._ext_patch.stop()

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
        cache.clear()   # prevent stale external_news cache from affecting direct service calls
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


class AnalyticsTest(TestCase):
    """Tests for the analytics system (Phase 6): view counts, trending, and stats."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='analyticsuser', password='testpass123')
        self.other_user = User.objects.create_user(username='analyticsother', password='testpass123')
        profile = self.user.profile
        profile.role = 'contributor'
        profile.verification_status = 'approved'
        profile.save()
        self.client.force_authenticate(user=self.user)
        self.news = News.objects.create(
            title="Analytics Test Article",
            description="Article used for analytics testing",
            author=self.user,
            category="Technology",
        )

    # ------------------------------------------------------------------ #
    # views_count — serializer field                                        #
    # ------------------------------------------------------------------ #

    def test_news_detail_includes_views_count(self):
        """GET /api/news/<pk>/ response includes views_count field."""
        response = self.client.get(f'/api/news/{self.news.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('views_count', response.data)

    # ------------------------------------------------------------------ #
    # views_count — increment logic                                         #
    # ------------------------------------------------------------------ #

    def test_get_detail_increments_views_count(self):
        """GET /api/news/<pk>/ increments views_count by exactly 1."""
        self.client.get(f'/api/news/{self.news.id}/')
        self.news.refresh_from_db()
        self.assertEqual(self.news.views_count, 1)

    def test_multiple_detail_views_accumulate(self):
        """Three GET requests → views_count == 3."""
        for _ in range(3):
            self.client.get(f'/api/news/{self.news.id}/')
        self.news.refresh_from_db()
        self.assertEqual(self.news.views_count, 3)

    def test_list_does_not_increment_views_count(self):
        """GET /api/news/ (list) must NOT touch views_count."""
        self.client.get('/api/news/')
        self.news.refresh_from_db()
        self.assertEqual(self.news.views_count, 0)

    # ------------------------------------------------------------------ #
    # Trending endpoint                                                     #
    # ------------------------------------------------------------------ #

    def test_trending_returns_200(self):
        """GET /api/news/trending/ returns 200 with paginated structure."""
        response = self.client.get('/api/news/trending/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_trending_orders_by_views_count_desc(self):
        """Article with higher views_count appears first in trending results."""
        low = News.objects.create(
            title="Low Views Article",
            description="Not the most popular article around",
            author=self.user,
            category="General",
        )
        high = News.objects.create(
            title="High Views Article",
            description="Very popular article with many views here",
            author=self.user,
            category="General",
        )
        News.objects.filter(pk=high.pk).update(views_count=50)
        News.objects.filter(pk=low.pk).update(views_count=5)
        News.objects.filter(pk=self.news.pk).update(views_count=0)

        response = self.client.get('/api/news/trending/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data['results']]
        # high must appear before low
        self.assertLess(ids.index(high.id), ids.index(low.id))

    def test_trending_returns_at_most_10_results(self):
        """Trending is capped at 10 articles even when the DB has more."""
        for i in range(12):
            News.objects.create(
                title=f"Bulk Article {i:02d}",
                description=f"Filler article number {i:02d} for trending cap test",
                author=self.user,
                category="General",
            )
        response = self.client.get('/api/news/trending/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Total items across all pages must be ≤ 10
        self.assertLessEqual(response.data['count'], 10)

    # ------------------------------------------------------------------ #
    # Contributor stats                                                     #
    # ------------------------------------------------------------------ #

    def test_contributor_stats_returns_200_with_keys(self):
        """GET /api/users/me/stats/ returns 200 with required keys."""
        response = self.client.get('/api/users/me/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('total_articles', 'total_views', 'total_likes'):
            self.assertIn(key, response.data)

    def test_contributor_stats_correct_totals(self):
        """Stats reflect accurate total_articles, total_views, total_likes."""
        News.objects.filter(pk=self.news.pk).update(views_count=7)
        Like.objects.create(user=self.other_user, news=self.news)

        response = self.client.get('/api/users/me/stats/')
        self.assertEqual(response.data['total_articles'], 1)
        self.assertEqual(response.data['total_views'], 7)
        self.assertEqual(response.data['total_likes'], 1)

    def test_contributor_stats_unauthenticated_returns_401(self):
        """Unauthenticated request to /api/users/me/stats/ returns 401."""
        response = APIClient().get('/api/users/me/stats/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ------------------------------------------------------------------ #
    # Global stats                                                          #
    # ------------------------------------------------------------------ #

    def test_global_stats_returns_200_with_keys(self):
        """GET /api/stats/ returns 200 with total_news, total_users, total_comments."""
        response = self.client.get('/api/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('total_news', 'total_users', 'total_comments'):
            self.assertIn(key, response.data)

    def test_global_stats_counts_are_accurate(self):
        """Global stats reflect actual DB state at call time."""
        Comment.objects.create(user=self.user, news=self.news, content='A global comment')
        response = self.client.get('/api/stats/')
        self.assertGreaterEqual(response.data['total_news'], 1)
        self.assertGreaterEqual(response.data['total_users'], 2)   # analyticsuser + analyticsother
        self.assertEqual(response.data['total_comments'], 1)


# ---------------------------------------------------------------------------
# Shared helper: create a valid in-memory JPEG for ImageField tests
# ---------------------------------------------------------------------------

def _make_image(filename='id.jpg'):
    from io import BytesIO
    from PIL import Image
    from django.core.files.uploadedfile import SimpleUploadedFile
    buf = BytesIO()
    Image.new('RGB', (10, 10), color=(255, 0, 0)).save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile(filename, buf.read(), content_type='image/jpeg')


class WebSocketTest(TestCase):
    """Tests for the real-time WebSocket notification system."""

    # ------------------------------------------------------------------ #
    # Connection                                                           #
    # ------------------------------------------------------------------ #

    def test_websocket_connection_accepted(self):
        """ws/news/ accepts a plain WebSocket connection."""
        from asgiref.sync import async_to_sync
        from channels.testing.websocket import WebsocketCommunicator
        from mediaflow.asgi import application

        async def _run():
            c = WebsocketCommunicator(application, "/ws/news/")
            connected, _ = await c.connect()
            await c.disconnect()
            return connected

        self.assertTrue(async_to_sync(_run)())

    # ------------------------------------------------------------------ #
    # Broadcast delivery                                                   #
    # ------------------------------------------------------------------ #

    def test_websocket_receives_new_news_broadcast(self):
        """group_send to news_updates is delivered to connected clients."""
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from channels.testing.websocket import WebsocketCommunicator
        from mediaflow.asgi import application

        async def _run():
            c = WebsocketCommunicator(application, "/ws/news/")
            await c.connect()

            layer = get_channel_layer()
            await layer.group_send(
                "news_updates",
                {
                    "type": "news.update",
                    "data": {"type": "new_news", "title": "Live Headline", "id": 42},
                },
            )

            data = await c.receive_json_from(timeout=3)
            await c.disconnect()
            return data

        payload = async_to_sync(_run)()
        self.assertEqual(payload["type"], "new_news")
        self.assertEqual(payload["id"], 42)
        self.assertEqual(payload["title"], "Live Headline")

    def test_websocket_receives_new_comment_broadcast(self):
        """new_comment events are forwarded to connected clients."""
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from channels.testing.websocket import WebsocketCommunicator
        from mediaflow.asgi import application

        async def _run():
            c = WebsocketCommunicator(application, "/ws/news/")
            await c.connect()

            layer = get_channel_layer()
            await layer.group_send(
                "news_updates",
                {
                    "type": "news.update",
                    "data": {"type": "new_comment", "news_id": 7},
                },
            )

            data = await c.receive_json_from(timeout=3)
            await c.disconnect()
            return data

        payload = async_to_sync(_run)()
        self.assertEqual(payload["type"], "new_comment")
        self.assertEqual(payload["news_id"], 7)


class ContributorVerificationTest(TestCase):
    """Tests for the contributor application and admin review workflow."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='applicant', password='testpass123')
        self.admin_user = User.objects.create_user(username='admin_user', password='testpass123')
        admin_profile = self.admin_user.profile
        admin_profile.role = 'admin'
        admin_profile.save()
        self.client.force_authenticate(user=self.user)

    # ------------------------------------------------------------------ #
    # Application submission                                               #
    # ------------------------------------------------------------------ #

    def test_user_can_submit_application(self):
        """Authenticated user submits an application; returns 201 with status=pending."""
        response = self.client.post(
            '/api/contributor/apply/',
            {
                'organization_name': 'Daily Tribune',
                'role': 'journalist',
                'id_document': _make_image(),
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')

    def test_unauthenticated_cannot_apply(self):
        """Unauthenticated request returns 401."""
        response = APIClient().post(
            '/api/contributor/apply/',
            {
                'organization_name': 'Daily Tribune',
                'role': 'journalist',
                'id_document': _make_image(),
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_file_type_is_rejected(self):
        """Uploading a non-image file returns 400."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        bad_file = SimpleUploadedFile('resume.pdf', b'%PDF fake', content_type='application/pdf')
        response = self.client.post(
            '/api/contributor/apply/',
            {
                'organization_name': 'Daily Tribune',
                'role': 'journalist',
                'id_document': bad_file,
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('id_document', response.data)

    # ------------------------------------------------------------------ #
    # Admin list view                                                      #
    # ------------------------------------------------------------------ #

    def test_admin_can_list_applications(self):
        """Admin gets 200 from GET /api/admin/applications/."""
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin_user)
        response = admin_client.get('/api/admin/applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_list_applications(self):
        """Non-admin user receives 403."""
        response = self.client.get('/api/admin/applications/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------ #
    # Admin review — approve                                               #
    # ------------------------------------------------------------------ #

    def _create_app(self):
        from .models import ContributorApplication
        return ContributorApplication.objects.create(
            user=self.user,
            organization_name='Daily Tribune',
            role='journalist',
            id_document='contributor_docs/test.jpg',
        )

    def test_admin_can_approve_application(self):
        """PATCH status=approved returns 200."""
        app = self._create_app()
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin_user)
        response = admin_client.patch(
            f'/api/admin/applications/{app.id}/',
            {'status': 'approved'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')

    def test_approval_upgrades_user_profile(self):
        """On approval the applicant becomes a verified contributor."""
        app = self._create_app()
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin_user)
        admin_client.patch(
            f'/api/admin/applications/{app.id}/',
            {'status': 'approved'},
            format='json',
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.role, 'contributor')
        self.assertTrue(self.user.profile.is_verified)
        self.assertEqual(self.user.profile.verification_status, 'approved')

    def test_approved_user_can_create_news(self):
        """After approval the applicant passes IsVerifiedContributor and can POST news."""
        app = self._create_app()
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin_user)
        admin_client.patch(
            f'/api/admin/applications/{app.id}/',
            {'status': 'approved'},
            format='json',
        )
        self.user.profile.refresh_from_db()  # clear ORM-cached profile so IsVerifiedContributor sees fresh DB state
        response = self.client.post('/api/news/', {
            'title': 'My First Article',
            'description': 'Written after becoming a verified contributor',
            'category': 'Technology',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------ #
    # Admin review — reject                                                #
    # ------------------------------------------------------------------ #

    def test_admin_can_reject_application(self):
        """PATCH status=rejected returns 200; role is not upgraded."""
        app = self._create_app()
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin_user)
        response = admin_client.patch(
            f'/api/admin/applications/{app.id}/',
            {'status': 'rejected'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'rejected')
        self.user.profile.refresh_from_db()
        self.assertNotEqual(self.user.profile.role, 'contributor')

    def test_invalid_review_status_returns_400(self):
        """Sending an unrecognised status value returns 400."""
        app = self._create_app()
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin_user)
        response = admin_client.patch(
            f'/api/admin/applications/{app.id}/',
            {'status': 'maybe'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_review_applications(self):
        """Non-admin PATCH returns 403."""
        app = self._create_app()
        response = self.client.patch(
            f'/api/admin/applications/{app.id}/',
            {'status': 'approved'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CacheTest(TestCase):
    """Tests for the caching system (Phase 7): external news, trending, and global stats."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(username='cacheuser', password='testpass123')
        self.other_user = User.objects.create_user(username='cacheother', password='testpass123')
        profile = self.user.profile
        profile.role = 'contributor'
        profile.verification_status = 'approved'
        profile.save()
        self.client.force_authenticate(user=self.user)
        self.news = News.objects.create(
            title="Cache Test Article",
            description="Article used for caching system tests",
            author=self.user,
            category="Technology",
        )

    def tearDown(self):
        cache.clear()

    # ------------------------------------------------------------------ #
    # External news — service-layer cache                                  #
    # ------------------------------------------------------------------ #

    def test_external_news_cached_on_successful_fetch(self):
        """_get_raw is called only once; the second call returns cached data."""
        from news.services.external_news import fetch_external_news as _fetch
        mock_response = {
            'status': 'ok',
            'articles': [{
                'title': 'Cached News Headline',
                'description': 'Description of the externally cached article',
                'source': {'name': 'Test Source'},
                'url': 'https://example.com/article',
                'urlToImage': 'https://example.com/image.jpg',
            }],
        }
        with patch('news.services.external_news._get_raw', return_value=mock_response) as mock_raw:
            with patch.dict(os.environ, {'NEWS_API_KEY': 'testkey'}, clear=False):
                result1 = _fetch()
                result2 = _fetch()
        mock_raw.assert_called_once()    # network hit exactly once
        self.assertEqual(result1, result2)
        self.assertEqual(len(result1), 1)
        self.assertTrue(result1[0]['is_external'])

    def test_external_news_not_cached_on_network_failure(self):
        """Network errors are not cached; each failed call retries the API."""
        from news.services.external_news import fetch_external_news as _fetch
        with patch(
            'news.services.external_news._get_raw',
            side_effect=Exception('connection refused'),
        ) as mock_raw:
            with patch.dict(os.environ, {'NEWS_API_KEY': 'testkey'}, clear=False):
                r1 = _fetch()
                r2 = _fetch()
        self.assertEqual(mock_raw.call_count, 2)   # retried — not cached
        self.assertEqual(r1, [])
        self.assertEqual(r2, [])

    def test_external_news_not_cached_on_bad_api_status(self):
        """A non-'ok' API status is not cached; each call hits the network."""
        from news.services.external_news import fetch_external_news as _fetch
        with patch(
            'news.services.external_news._get_raw',
            return_value={'status': 'error', 'message': 'apiKeyInvalid'},
        ) as mock_raw:
            with patch.dict(os.environ, {'NEWS_API_KEY': 'badkey'}, clear=False):
                _fetch()
                _fetch()
        self.assertEqual(mock_raw.call_count, 2)   # both calls hit the API

    # ------------------------------------------------------------------ #
    # Trending cache — view layer                                          #
    # ------------------------------------------------------------------ #

    def test_trending_serves_cached_response(self):
        """DB changes after the first trending request are hidden by the cache."""
        response1 = self.client.get('/api/news/trending/')
        count_before = response1.data['count']
        # Create directly via ORM — does NOT trigger perform_create → no cache bust
        News.objects.create(
            title="Post-Cache Trending Article",
            description="Should not appear in the still-warm cached response",
            author=self.user,
            category="General",
        )
        response2 = self.client.get('/api/news/trending/')
        self.assertEqual(response2.data['count'], count_before)   # stale cache served

    def test_trending_cache_invalidated_after_api_create(self):
        """Creating an article via the API clears the trending cache."""
        self.client.get('/api/news/trending/')   # warm the cache
        # POST goes through perform_create() → cache.delete(_TRENDING_CACHE_KEY)
        self.client.post('/api/news/', {
            'title': 'Brand New Trending Article',
            'description': 'Created via API to trigger cache invalidation',
            'category': 'Technology',
        })
        response = self.client.get('/api/news/trending/')
        self.assertGreaterEqual(response.data['count'], 2)   # fresh DB query

    # ------------------------------------------------------------------ #
    # Global stats cache — view layer                                      #
    # ------------------------------------------------------------------ #

    def test_global_stats_serves_cached_response(self):
        """DB changes after the first stats request are hidden by the cache."""
        response1 = self.client.get('/api/stats/')
        news_before = response1.data['total_news']
        # Direct ORM create — no cache invalidation
        News.objects.create(
            title="Another Stats Article",
            description="Should not appear in cached stats response here",
            author=self.user,
            category="General",
        )
        response2 = self.client.get('/api/stats/')
        self.assertEqual(response2.data['total_news'], news_before)   # stale cache served

    def test_global_stats_cache_invalidated_after_api_create(self):
        """Creating an article via the API clears the global stats cache."""
        self.client.get('/api/stats/')   # warm the cache
        self.client.post('/api/news/', {
            'title': 'Stats Invalidation Test Article',
            'description': 'Created via API to clear the global stats cache',
            'category': 'Technology',
        })
        response = self.client.get('/api/stats/')
        self.assertGreaterEqual(response.data['total_news'], 2)   # fresh DB count

    # ------------------------------------------------------------------ #
    # Safety — caching must not affect existing correctness                #
    # ------------------------------------------------------------------ #

    def test_views_count_increments_are_unaffected_by_caching(self):
        """view_count still increments correctly — detail endpoint is not cached."""
        self.client.get(f'/api/news/{self.news.id}/')
        self.news.refresh_from_db()
        self.assertEqual(self.news.views_count, 1)

    def test_contributor_stats_always_reflect_current_db(self):
        """Contributor stats are never cached — each call reads fresh DB state."""
        response1 = self.client.get('/api/users/me/stats/')
        count_before = response1.data['total_articles']
        News.objects.create(
            title="Extra Article for User Stats",
            description="Testing that contributor stats bypass the cache",
            author=self.user,
            category="General",
        )
        response2 = self.client.get('/api/users/me/stats/')
        self.assertEqual(response2.data['total_articles'], count_before + 1)
