"""
External news aggregation service.

Fetches top English headlines from NewsAPI and normalises them into a
flat dict structure that can be merged with the internal news feed.

Environment variable required:
    NEWS_API_KEY  — your NewsAPI key (https://newsapi.org)

If the key is absent or the request fails for any reason, the function
returns an empty list so the caller's response is never broken.
"""
import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

_NEWS_API_BASE = 'https://newsapi.org/v2/top-headlines'
_TIMEOUT = 5          # seconds — keeps latency bounded
_PAGE_SIZE = 10       # articles per fetch


def _get_raw(url: str) -> dict:
    """
    Performs the actual HTTP request.
    Isolated in its own function so unit tests can patch it without
    touching the real network.
    """
    with urllib.request.urlopen(url, timeout=_TIMEOUT) as response:
        return json.loads(response.read().decode('utf-8'))


def fetch_external_news() -> list:
    """
    Return a list of normalised article dicts from NewsAPI top-headlines.

    Each dict has the shape::

        {
            "title":       str,
            "description": str,
            "source":      str,   # human-readable source name
            "url":         str,
            "image":       str,
            "is_external": True,
        }

    Returns [] on any failure (no key configured, network error, bad
    API status, JSON decode error, etc.) so callers never need to guard
    against exceptions.
    """
    api_key = os.getenv('NEWS_API_KEY', '').strip()
    if not api_key:
        logger.debug('NEWS_API_KEY not configured — skipping external news fetch')
        return []

    params = urllib.parse.urlencode({
        'apiKey': api_key,
        'language': 'en',
        'pageSize': _PAGE_SIZE,
    })
    url = f'{_NEWS_API_BASE}?{params}'

    try:
        data = _get_raw(url)
    except urllib.error.URLError as exc:
        logger.warning('External news: network error — %s', exc)
        return []
    except Exception as exc:
        logger.warning('External news: unexpected error — %s', exc)
        return []

    if data.get('status') != 'ok':
        logger.warning('External news: API returned status=%s', data.get('status'))
        return []

    articles = []
    for item in data.get('articles', []):
        articles.append({
            'title':       item.get('title') or '',
            'description': item.get('description') or '',
            'source':      (item.get('source') or {}).get('name') or '',
            'url':         item.get('url') or '',
            'image':       item.get('urlToImage') or '',
            'is_external': True,
        })
    return articles
