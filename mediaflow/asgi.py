"""
ASGI config for mediaflow project.

Exposes the ASGI callable as a module-level variable named ``application``.
HTTP requests are handled by Django's standard ASGI application;
WebSocket connections are routed through Django Channels.
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mediaflow.settings')

# Django must be fully initialised before any app-level imports (consumers,
# routing) can be resolved — get_asgi_application() triggers that setup.
from django.core.asgi import get_asgi_application  # noqa: E402

_django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack          # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from news.routing import websocket_urlpatterns          # noqa: E402

application = ProtocolTypeRouter({
    "http": _django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
