from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom UserAdmin to display additional fields in Django admin.
    """
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra Fields', {'fields': ('profile_picture', 'bio')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Extra Fields', {'fields': ('profile_picture', 'bio')}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'profile_picture')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
```