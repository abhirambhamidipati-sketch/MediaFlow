from django.urls import path

from .views import (
    CommentDestroyView,
    ContributorStatsView,
    GlobalStatsView,
    NewsBookmarkView,
    NewsCommentListCreateView,
    NewsLikeView,
    NewsListCreateAPIView,
    NewsRetrieveUpdateDestroyAPIView,
    NewsTrendingView,
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

    # --- Analytics: per-user stats ---
    path('users/me/stats/', ContributorStatsView.as_view(), name='contributor-stats'),

    # --- Analytics: global platform stats ---
    path('stats/', GlobalStatsView.as_view(), name='global-stats'),
]
