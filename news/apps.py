from django.apps import AppConfig


class NewsConfig(AppConfig):
    name = 'news'

    def ready(self):
        import news.signals  # noqa: F401 — registers post_save signal
