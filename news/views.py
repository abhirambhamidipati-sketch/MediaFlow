from django.contrib.auth import get_user_model
from django.db.models import Count, F, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Bookmark, Comment, Like, News
from .permissions import IsOwnerOrReadOnly, IsVerifiedContributor
from .serializers import CommentSerializer, NewsSerializer
from .services.external_news import fetch_external_news


class NewsListCreateAPIView(generics.ListCreateAPIView):
    queryset = News.objects.all().order_by('-created_at')
    serializer_class = NewsSerializer
    permission_classes = [IsAuthenticated, IsVerifiedContributor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'author']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def list(self, request, *args, **kwargs):
        source = request.query_params.get('source', 'all')

        # ?source=internal — standard DRF behavior with full pagination intact.
        if source == 'internal':
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # ?source=external — skip DB entirely, return only external articles.
        if source == 'external':
            articles = fetch_external_news()
            return Response({
                'count': len(articles),
                'next': None,
                'previous': None,
                'results': articles,
            })

        # Default (no source param / source=all) — combine both feeds.
        # DRF filters (?category, ?search, ?ordering) are applied to internal news.
        # External news is appended as-is; ?source is ignored by all filter backends.
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        internal_data = [dict(item, is_external=False) for item in serializer.data]

        external_data = fetch_external_news()

        combined = internal_data + external_data
        return Response({
            'count': len(combined),
            'next': None,
            'previous': None,
            'results': combined,
        })

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class NewsRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = News.objects.all()
    serializer_class = NewsSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def retrieve(self, request, *args, **kwargs):
        # Increment views atomically using F() — prevents race conditions.
        # .update() runs a single SQL UPDATE; the fresh SELECT below picks up
        # the new value automatically.
        News.objects.filter(pk=kwargs['pk']).update(views_count=F('views_count') + 1)
        return super().retrieve(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Like system
# ---------------------------------------------------------------------------

class NewsLikeView(APIView):
    """
    POST  /api/news/<pk>/like/  — toggle like on an internal article.
      • If not yet liked  → creates Like, returns HTTP 201 {liked: true}
      • If already liked  → removes Like, returns HTTP 200 {liked: false}
    DELETE /api/news/<pk>/like/ — explicit unlike, always HTTP 200.

    Returns 404 for non-existent news IDs (external articles have no DB record).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        news = get_object_or_404(News, pk=pk)
        like, created = Like.objects.get_or_create(user=request.user, news=news)
        if created:
            return Response(
                {'liked': True, 'likes_count': news.likes.count()},
                status=status.HTTP_201_CREATED,
            )
        # Already liked — toggle off
        like.delete()
        return Response(
            {'liked': False, 'likes_count': news.likes.count()},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        news = get_object_or_404(News, pk=pk)
        Like.objects.filter(user=request.user, news=news).delete()
        return Response(
            {'liked': False, 'likes_count': news.likes.count()},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Bookmark system
# ---------------------------------------------------------------------------

class NewsBookmarkView(APIView):
    """
    POST  /api/news/<pk>/bookmark/  — toggle bookmark.
    DELETE /api/news/<pk>/bookmark/ — explicit remove.

    Returns 404 for non-existent news IDs.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        news = get_object_or_404(News, pk=pk)
        bookmark, created = Bookmark.objects.get_or_create(user=request.user, news=news)
        if created:
            return Response({'bookmarked': True}, status=status.HTTP_201_CREATED)
        # Already bookmarked — toggle off
        bookmark.delete()
        return Response({'bookmarked': False}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        news = get_object_or_404(News, pk=pk)
        Bookmark.objects.filter(user=request.user, news=news).delete()
        return Response({'bookmarked': False}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Comment system
# ---------------------------------------------------------------------------

class NewsCommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/news/<pk>/comments/  — list comments for an article (paginated).
    POST /api/news/<pk>/comments/  — add a comment; user set from JWT token.

    Returns 404 if the news article does not exist.
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Validate the parent news exists (returns 404 for unknown/external IDs)
        get_object_or_404(News, pk=self.kwargs['pk'])
        return Comment.objects.filter(news_id=self.kwargs['pk']).order_by('created_at')

    def perform_create(self, serializer):
        news = get_object_or_404(News, pk=self.kwargs['pk'])
        serializer.save(user=self.request.user, news=news)


class CommentDestroyView(generics.DestroyAPIView):
    """
    DELETE /api/comments/<pk>/  — delete a comment.

    Only the comment author may delete; attempting otherwise returns 403.
    """
    permission_classes = [IsAuthenticated]
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

    def get_object(self):
        comment = get_object_or_404(Comment, pk=self.kwargs['pk'])
        if comment.user != self.request.user:
            raise PermissionDenied("You can only delete your own comments.")
        return comment


# ---------------------------------------------------------------------------
# Analytics — trending feed
# ---------------------------------------------------------------------------

class NewsTrendingView(generics.ListAPIView):
    """
    GET /api/news/trending/

    Returns the top-10 internal articles ordered by:
      1. views_count DESC  (primary)
      2. likes_count DESC  (secondary — via annotation to avoid N+1)

    External articles have no DB records and are excluded by design.
    Pagination applies (inherits PAGE_SIZE from settings).
    """
    serializer_class = NewsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            News.objects
            .annotate(likes_ann=Count('likes'))
            .order_by('-views_count', '-likes_ann')[:10]
        )


# ---------------------------------------------------------------------------
# Analytics — contributor stats
# ---------------------------------------------------------------------------

class ContributorStatsView(APIView):
    """
    GET /api/users/me/stats/

    Returns aggregated stats for the authenticated user's articles:
      {
        "total_articles": <int>,
        "total_views":    <int>,
        "total_likes":    <int>
      }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_news = News.objects.filter(author=request.user)
        total_articles = user_news.count()
        total_views = user_news.aggregate(total=Sum('views_count'))['total'] or 0
        total_likes = Like.objects.filter(news__author=request.user).count()
        return Response({
            'total_articles': total_articles,
            'total_views': total_views,
            'total_likes': total_likes,
        })


# ---------------------------------------------------------------------------
# Analytics — global platform stats
# ---------------------------------------------------------------------------

class GlobalStatsView(APIView):
    """
    GET /api/stats/

    Returns platform-wide counts:
      {
        "total_news":     <int>,
        "total_users":    <int>,
        "total_comments": <int>
      }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        User = get_user_model()
        return Response({
            'total_news': News.objects.count(),
            'total_users': User.objects.count(),
            'total_comments': Comment.objects.count(),
        })
