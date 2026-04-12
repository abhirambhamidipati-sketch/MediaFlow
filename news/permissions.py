from rest_framework.permissions import BasePermission, SAFE_METHODS


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
