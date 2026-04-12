from rest_framework import serializers

from .models import News

VALID_CATEGORIES = ["Technology", "Sports", "Politics", "Entertainment", "General"]


class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = '__all__'
        read_only_fields = ['author']

    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError(
                "Title must be at least 5 characters long."
            )
        return value

    def validate_description(self, value):
        if len(value) < 10:
            raise serializers.ValidationError(
                "Description must be at least 10 characters long."
            )
        return value

    def validate_category(self, value):
        if value not in VALID_CATEGORIES:
            raise serializers.ValidationError(
                f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}."
            )
        return value

    def validate(self, data):
        """Cross-field check: title and description must not be identical."""
        title = data.get('title', '').strip().lower()
        description = data.get('description', '').strip().lower()
        if title and description and title == description:
            raise serializers.ValidationError(
                "Title and description cannot be identical."
            )
        return data
