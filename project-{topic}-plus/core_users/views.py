from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.generic import CreateView, DetailView, UpdateView
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from django.urls import reverse_lazy
from django.contrib import messages

from .forms import CustomUserCreationForm, CustomUserChangeForm
from .models import User

class SignUpView(CreateView):
    form_class = CustomUserCreationForm
    success_url = reverse_lazy('login')
    template_name = 'registration/signup.html'

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, 'Account created successfully! Please log in.')
        return response

class UserProfileView(DetailView):
    model = User
    template_name = 'core_users/user_profile.html'
    context_object_name = 'user_profile'
    slug_field = 'username' # Use username to fetch the profile
    slug_url_kwarg = 'username'

    def get_queryset(self):
        # Only allow viewing of active users
        return User.objects.filter(is_active=True)

class UserProfileUpdateView(UpdateView):
    model = User
    form_class = CustomUserChangeForm
    template_name = 'core_users/user_profile_update.html'
    slug_field = 'username'
    slug_url_kwarg = 'username'

    def get_success_url(self):
        messages.success(self.request, 'Profile updated successfully!')
        return reverse_lazy('user_profile', kwargs={'username': self.object.username})

    def get_queryset(self):
        # Only allow a user to update their own profile
        return super().get_queryset().filter(id=self.request.user.id)

    def form_valid(self, form):
        # Ensure 'request.user' is not modified directly if it's the target of update
        # For simplicity, we directly save the form here.
        response = super().form_valid(form)
        return response

@login_required
def change_password(request):
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # Important! Update the session
            messages.success(request, 'Your password was successfully updated!')
            return redirect('user_profile', username=request.user.username)
        else:
            messages.error(request, 'Please correct the error below.')
    else:
        form = PasswordChangeForm(request.user)
    return render(request, 'core_users/change_password.html', {'form': form})
```