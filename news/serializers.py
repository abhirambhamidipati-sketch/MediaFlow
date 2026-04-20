from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, ContributorApplication, News, UserProfile

VALID_CATEGORIES = ["Technology", "Sports", "Politics", "Entertainment", "General"]


class NewsSerializer(serializers.ModelSerializer):
    # --- engagement counts (read-only, computed from reverse relations) ---
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    # --- per-request flags (require request in serializer context) ---
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    # --- author display name (additive, read-only) ---
    author_username = serializers.SerializerMethodField()

    class Meta:
        model = News
        fields = '__all__'
        read_only_fields = ['author', 'views_count']

    # ------------------------------------------------------------------
    # Engagement method fields
    # ------------------------------------------------------------------

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.bookmarks.filter(user=request.user).exists()
        return False

    def get_author_username(self, obj):
        if obj.author:
            return obj.author.username
        return None

    # ------------------------------------------------------------------
    # Field-level validation (unchanged)
    # ------------------------------------------------------------------

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


class CommentSerializer(serializers.ModelSerializer):
    """
    Serializer for Comment objects.

    `username` is read-only and sourced from the related User.
    `user` and `news` are set automatically in `perform_create` and are
    never exposed as writable fields.
    """
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'username', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


# ---------------------------------------------------------------------------
# Contributor verification serializers
# ---------------------------------------------------------------------------

_ALLOWED_IMAGE_TYPES = ('image/jpeg', 'image/png', 'image/webp')


class ContributorApplicationSerializer(serializers.ModelSerializer):
    """
    Used by applicants (POST /api/contributor/apply/) and by the admin
    list view (GET /api/admin/applications/).
    """
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ContributorApplication
        fields = [
            'id', 'username', 'organization_name', 'role',
            'id_document', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'username', 'status', 'created_at']

    def validate_id_document(self, value):
        ct = getattr(value, 'content_type', None)
        if ct and ct not in _ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f"Only JPEG, PNG, and WEBP images are accepted (got {ct})."
            )
        return value


class ApplicationReviewSerializer(serializers.ModelSerializer):
    """
    Used by admins to approve or reject an application
    (PATCH /api/admin/applications/<pk>/).

    On approval the applicant's UserProfile is automatically upgraded:
      role → 'contributor', is_verified → True, verification_status → 'approved'
    """

    class Meta:
        model = ContributorApplication
        fields = ['id', 'status', 'reviewed_by']
        read_only_fields = ['id', 'reviewed_by']

    def validate_status(self, value):
        if value not in ('approved', 'rejected'):
            raise serializers.ValidationError(
                "Status must be 'approved' or 'rejected'."
            )
        return value

    def update(self, instance, validated_data):
        validated_data['reviewed_by'] = self.context['request'].user
        instance = super().update(instance, validated_data)
        if instance.status == 'approved':
            profile = instance.user.profile
            profile.role = 'contributor'
            profile.is_verified = True
            profile.verification_status = 'approved'
            profile.save()
        return instance


# ---------------------------------------------------------------------------
# User registration & profile serializers
# ---------------------------------------------------------------------------

User = get_user_model()


class UserRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
        )


class UserProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'role', 'is_verified', 'verification_status']
