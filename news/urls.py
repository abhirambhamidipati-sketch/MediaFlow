from django.urls import path
from .views import NewsListCreateAPIView, NewsRetrieveUpdateDestroyAPIView

urlpatterns = [
    path('news/', NewsListCreateAPIView.as_view(), name='news-list-create'),
    path('news/<int:pk>/', NewsRetrieveUpdateDestroyAPIView.as_view(), name='news-detail'),
]