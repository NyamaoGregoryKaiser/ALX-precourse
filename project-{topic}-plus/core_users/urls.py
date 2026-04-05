from django.urls import path, include
from django.contrib.auth import views as auth_views
from .views import SignUpView, UserProfileView, UserProfileUpdateView, change_password

urlpatterns = [
    # Django Auth URLs
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(template_name='registration/logged_out.html'), name='logout'),
    path('password_change/', change_password, name='password_change'),
    path('password_reset/', auth_views.PasswordResetView.as_view(template_name='registration/password_reset_form.html'), name='password_reset'),
    path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(template_name='registration/password_reset_done.html'), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name='registration/password_reset_confirm.html'), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(template_name='registration/password_reset_complete.html'), name='password_reset_complete'),

    # Custom User URLs
    path('signup/', SignUpView.as_view(), name='signup'),
    path('<str:username>/', UserProfileView.as_view(), name='user_profile'),
    path('<str:username>/edit/', UserProfileUpdateView.as_view(), name='user_profile_update'),
]
```