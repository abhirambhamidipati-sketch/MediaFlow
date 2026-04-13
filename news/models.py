from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('viewer', 'Viewer'),
        ('contributor', 'Contributor'),
        ('admin', 'Admin'),
    ]
    VERIFICATION_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    is_verified = models.BooleanField(default=False)
    organization = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_CHOICES,
        default='pending',
    )
    id_proof = models.FileField(upload_to='verification_docs/', null=True, blank=True)

    def __str__(self):
        return f'{self.user.username} ({self.role})'


class News(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='news_articles',
    )
    category = models.CharField(max_length=100)
    image = models.ImageField(upload_to='news_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    views_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.title


class Like(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='likes',
    )
    news = models.ForeignKey(
        News,
        on_delete=models.CASCADE,
        related_name='likes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'news')

    def __str__(self):
        return f'{self.user.username} likes "{self.news.title}"'


class Bookmark(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookmarks',
    )
    news = models.ForeignKey(
        News,
        on_delete=models.CASCADE,
        related_name='bookmarks',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'news')

    def __str__(self):
        return f'{self.user.username} bookmarked "{self.news.title}"'


class Comment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    news = models.ForeignKey(
        News,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} on "{self.news.title}"'