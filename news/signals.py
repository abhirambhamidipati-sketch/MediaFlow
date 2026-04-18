import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Comment, News, UserProfile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# User profile auto-creation (unchanged)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a UserProfile (role=viewer) for every new User."""
    if created:
        UserProfile.objects.create(user=instance)


# ---------------------------------------------------------------------------
# WebSocket broadcast helpers
# ---------------------------------------------------------------------------

def _broadcast(payload: dict) -> None:
    """
    Send *payload* to the ``news_updates`` channel group.

    Failures are logged and swallowed so that a WebSocket outage never
    prevents a database write from completing.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            "news_updates",
            {"type": "news.update", "data": payload},
        )
    except Exception as exc:
        logger.warning("WebSocket broadcast failed: %s", exc)


@receiver(post_save, sender=News)
def broadcast_new_news(sender, instance, created, **kwargs):
    if created:
        _broadcast({
            "type": "new_news",
            "title": instance.title,
            "id": instance.id,
        })


@receiver(post_save, sender=Comment)
def broadcast_new_comment(sender, instance, created, **kwargs):
    if created:
        _broadcast({
            "type": "new_comment",
            "news_id": instance.news_id,
        })
