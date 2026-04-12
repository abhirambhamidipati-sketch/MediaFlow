from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import News
from .permissions import IsOwnerOrReadOnly, IsVerifiedContributor
from .serializers import NewsSerializer
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
