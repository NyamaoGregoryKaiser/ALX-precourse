from rest_framework import permissions
from django.contrib.auth.mixins import AccessMixin

class IsAuthorOrAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow authors of an object or admins to edit it.
    Read-only access is allowed for any request.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the author or an admin.
        return obj.author == request.user or request.user.is_staff

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow staff users to create/update/delete.
    Read-only access is allowed for any request.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class IsCommentAuthorOrModerator(permissions.BasePermission):
    """
    Custom permission to allow comment author to edit/delete, or staff to manage comments.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Only author or staff can edit/delete comments
        return obj.author == request.user or request.user.is_staff

# Mixin for Django class-based views
class StaffRequiredMixin(AccessMixin):
    """Verify that the current user is authenticated and is staff."""
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_staff:
            return self.handle_no_permission()
        return super().dispatch(request, *args, **kwargs)

class AuthorRequiredMixin(AccessMixin):
    """Verify that the current user is authenticated and is the author of the object."""
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        obj = self.get_object()
        if not obj.author == request.user:
            return self.handle_no_permission()
        return super().dispatch(request, *args, **kwargs)

class AuthorOrStaffRequiredMixin(AccessMixin):
    """Verify that the current user is authenticated and is either the author or staff."""
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        obj = self.get_object()
        if not (obj.author == request.user or request.user.is_staff):
            return self.handle_no_permission()
        return super().dispatch(request, *args, **kwargs)
```