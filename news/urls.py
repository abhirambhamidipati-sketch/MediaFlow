from django.urls import path

from .oauth_views import GoogleOAuthView
from .views import (
    ApplicationListView,
    ApplicationReviewView,
    CommentDestroyView,
    ContributorApplyView,
    ContributorStatsView,
    GlobalStatsView,
    NewsBookmarkView,
    NewsCommentListCreateView,
    NewsLikeView,
    NewsListCreateAPIView,
    NewsRetrieveUpdateDestroyAPIView,
    NewsTrendingView,
    UserBookmarksView,
    UserMeView,
    UserRegisterView,
)

urlpatterns = [
    # --- News CRUD ---
    path('news/', NewsListCreateAPIView.as_view(), name='news-list-create'),

    # --- Analytics: trending (must precede <int:pk> for clarity) ---
    path('news/trending/', NewsTrendingView.as_view(), name='news-trending'),

    path('news/<int:pk>/', NewsRetrieveUpdateDestroyAPIView.as_view(), name='news-detail'),

    # --- Engagement: likes ---
    path('news/<int:pk>/like/', NewsLikeView.as_view(), name='news-like'),

    # --- Engagement: bookmarks ---
    path('news/<int:pk>/bookmark/', NewsBookmarkView.as_view(), name='news-bookmark'),

    # --- Engagement: comments ---
    path('news/<int:pk>/comments/', NewsCommentListCreateView.as_view(), name='news-comments'),
    path('comments/<int:pk>/', CommentDestroyView.as_view(), name='comment-delete'),

    # --- User registration & profile ---
    path('users/register/', UserRegisterView.as_view(), name='user-register'),
    path('users/auth/google/', GoogleOAuthView.as_view(), name='user-google-oauth'),
    path('users/me/', UserMeView.as_view(), name='user-me'),
    path('users/me/bookmarks/', UserBookmarksView.as_view(), name='user-bookmarks'),

    # --- Analytics: per-user stats ---
    path('users/me/stats/', ContributorStatsView.as_view(), name='contributor-stats'),

    # --- Analytics: global platform stats ---
    path('stats/', GlobalStatsView.as_view(), name='global-stats'),

    # --- Contributor verification workflow ---
    path('contributor/apply/', ContributorApplyView.as_view(), name='contributor-apply'),
    path('admin/applications/', ApplicationListView.as_view(), name='application-list'),
    path('admin/applications/<int:pk>/', ApplicationReviewView.as_view(), name='application-review'),
]
