# Generated migration — Phase 2: Replace author CharField with ForeignKey
#
# Strategy: RemoveField drops the old VARCHAR column (existing string author
# data is intentionally discarded — it holds display names, not user IDs).
# AddField then creates the new integer FK column; all pre-existing rows
# receive author=NULL, which null=True permits. New rows are always assigned
# an author via perform_create in the view.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('news', '0003_alter_news_id'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name='news',
            name='author',
        ),
        migrations.AddField(
            model_name='news',
            name='author',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='news_articles',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='news',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
