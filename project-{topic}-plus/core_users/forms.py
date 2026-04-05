from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User

class CustomUserCreationForm(UserCreationForm):
    """
    A custom form for creating new users.
    Includes profile_picture and bio fields.
    """
    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('email', 'profile_picture', 'bio',)

class CustomUserChangeForm(UserChangeForm):
    """
    A custom form for updating existing users.
    Includes profile_picture and bio fields.
    """
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'profile_picture', 'bio', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
```