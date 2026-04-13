from django.urls import path

from .views import (
    CommentDestroyView,
    NewsBookmarkView,
    NewsCommentListCreateView,
    NewsLikeView,
    NewsListCreateAPIView,
    NewsRetrieveUpdateDestroyAPIView,
)

urlpatterns = [
    # --- News CRUD (unchanged) ---
    path('news/', NewsListCreateAPIView.as_view(), name='news-list-create'),
    path('news/<int:pk>/', NewsRetrieveUpdateDestroyAPIView.as_view(), name='news-detail'),

    # --- Engagement: likes ---
    path('news/<int:pk>/like/', NewsLikeView.as_view(), name='news-like'),

    # --- Engagement: bookmarks ---
    path('news/<int:pk>/bookmark/', NewsBookmarkView.as_view(), name='news-bookmark'),

    # --- Engagement: comments ---
    path('news/<int:pk>/comments/', NewsCommentListCreateView.as_view(), name='news-comments'),
    path('comments/<int:pk>/', CommentDestroyView.as_view(), name='comment-delete'),
]
