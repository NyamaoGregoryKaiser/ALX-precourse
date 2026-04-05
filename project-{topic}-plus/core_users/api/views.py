from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from core_users.models import User
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from .permissions import IsOwnerOrAdmin
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

class UserViewSet(mixins.RetrieveModelMixin,
                  mixins.UpdateModelMixin,
                  mixins.DestroyModelMixin,
                  mixins.ListModelMixin,
                  viewsets.GenericViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    Allows listing all users, retrieving, updating, and deleting a specific user.
    Also includes a 'me' action for the currently authenticated user.
    """
    queryset = User.objects.filter(is_active=True).order_by('-date_joined')
    serializer_class = UserSerializer
    lookup_field = 'username' # Allow lookup by username in URL

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'create': # Signup action uses UserCreateSerializer
            permission_classes = [AllowAny]
        elif self.action in ['retrieve', 'list']:
            permission_classes = [AllowAny] # Anyone can view user profiles
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
        elif self.action == 'me':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated] # Default for other actions
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    @extend_schema(
        summary="Register a new user",
        request=UserCreateSerializer,
        responses={201: UserSerializer},
        description="Allows new users to register an account."
    )
    def create(self, request, *args, **kwargs):
        """
        Handles user registration.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED, headers=headers)

    @extend_schema(
        summary="Get details of the currently authenticated user",
        responses={200: UserSerializer},
        description="Retrieves the profile information for the user making the request."
    )
    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """
        Returns the details of the currently authenticated user.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary="Update the currently authenticated user's profile",
        request=UserUpdateSerializer,
        responses={200: UserSerializer},
        description="Allows the authenticated user to update their own profile details."
    )
    @me.mapping.put # Allows PUT method for /api/v1/users/me/
    def update_me(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
```