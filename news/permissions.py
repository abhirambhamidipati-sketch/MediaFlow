from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import UserProfile


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission: read access is granted to any authenticated user;
    write access (PUT, PATCH, DELETE) is restricted to the object's owner.

    Must be used alongside IsAuthenticated at the view level, as this class
    only overrides has_object_permission and does not enforce authentication
    at the view level on its own.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.author == request.user


class IsVerifiedContributor(BasePermission):
    """
    View-level permission: restricts POST (create) to users whose profile has
    role='contributor' AND verification_status='approved'.

    Safe methods (GET, HEAD, OPTIONS) bypass this check — listing/reading news
    remains unrestricted by role. PUT/PATCH/DELETE on the detail view are
    governed by IsOwnerOrReadOnly, not this class.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if request.method == 'POST':
            if not request.user or not request.user.is_authenticated:
                return False
            try:
                profile = request.user.profile
            except UserProfile.DoesNotExist:
                return False
            return (
                profile.role == 'contributor'
                and profile.verification_status == 'approved'
            )
        return True
