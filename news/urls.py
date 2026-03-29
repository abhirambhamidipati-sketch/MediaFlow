from django.urls import path
from .views import NewsListCreateAPIView

urlpatterns = [
    path("news/", NewsListCreateAPIView.as_view(), name="news-list-create"),
]