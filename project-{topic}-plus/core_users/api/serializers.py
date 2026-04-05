from rest_framework import serializers
from core_users.models import User

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the custom User model.
    """
    full_name = serializers.CharField(source='full_name', read_only=True)
    profile_picture_url = serializers.ImageField(source='profile_picture', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'profile_picture_url', 'bio',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login'
        )
        read_only_fields = ('is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login')

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new user (registration).
    """
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password2', 'bio', 'profile_picture')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password2') # Remove password2 before creating user
        user = User.objects.create_user(**validated_data)
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating an existing user's profile.
    """
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'bio', 'profile_picture')
```