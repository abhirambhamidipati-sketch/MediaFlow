"""
WebSocket consumer for real-time news updates.

Clients connect to ``ws/news/`` and join the ``news_updates`` group.
The consumer is read-only: clients receive events but cannot publish.

Event types dispatched to this group:
    news.update  →  forwarded as-is to the WebSocket client
        payload: {"type": "new_news",    "title": "...", "id": <int>}
                 {"type": "new_comment", "news_id": <int>}
"""

import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

_GROUP_NAME = "news_updates"


class NewsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(_GROUP_NAME, self.channel_name)
        await self.accept()
        logger.debug("WS connected: %s", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(_GROUP_NAME, self.channel_name)
        logger.debug("WS disconnected: %s (code=%s)", self.channel_name, close_code)

    async def receive(self, text_data=None, bytes_data=None):
        # Read-only channel — incoming client messages are silently ignored.
        pass

    # Channels dispatches type "news.update" (dot → underscore) to this method.
    async def news_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))
