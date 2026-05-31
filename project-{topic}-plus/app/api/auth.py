from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, current_user as jwt_current_user, get_jwt
from app.models import User
from app.schemas import user_register_schema, user_login_schema, user_schema
from app.extensions import db, jwt, limiter
from app.errors import BadRequestError, UnauthorizedError, ConflictError, NotFoundError
import logging

log = logging.getLogger(__name__)

auth_ns = Namespace('auth', description='Authentication related operations')

# Define request/response models for Flask-RESTX documentation
user_register_model = auth_ns.model('UserRegister', {
    'username': fields.String(required=True, description='User\'s chosen username'),
    'email': fields.String(required=True, description='User\'s email address', attribute='email'),
    'password': fields.String(required=True, description='User\'s password', min_length=6)
})

user_login_model = auth_ns.model('UserLogin', {
    'email': fields.String(required=True, description='User\'s email address'),
    'password': fields.String(required=True, description='User\'s password')
})

auth_success_model = auth_ns.model('AuthSuccess', {
    'message': fields.String(description='Success message'),
    'access_token': fields.String(description='JWT Access Token'),
    'refresh_token': fields.String(description='JWT Refresh Token'),
    'user': fields.Nested(user_schema.as_dict())
})

token_refresh_model = auth_ns.model('TokenRefresh', {
    'access_token': fields.String(description='New JWT Access Token'),
})

@auth_ns.route('/register')
class UserRegister(Resource):
    @limiter.limit("5 per minute", error_message="Too many registration attempts. Please try again later.")
    @auth_ns.expect(user_register_model, validate=True)
    @auth_ns.marshal_with(auth_success_model, code=201)
    @auth_ns.response(400, 'Validation Error')
    @auth_ns.response(409, 'Conflict (User already exists)')
    @auth_ns.response(500, 'Internal Server Error')
    def post(self):
        """Register a new user and return JWT tokens."""
        data = request.json
        # Validate input using Marshmallow schema
        try:
            user_data = user_register_schema.load(data)
        except Exception as e:
            log.warning(f"Registration validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Check if user already exists
        if User.query.filter_by(email=user_data.email).first():
            raise ConflictError("A user with that email address already exists.")
        if User.query.filter_by(username=user_data.username).first():
            raise ConflictError("A user with that username already exists.")

        user = User(username=user_data.username, email=user_data.email)
        user.set_password(data['password']) # Use raw password from request data
        db.session.add(user)
        db.session.commit()

        # Create JWT tokens
        additional_claims = {"is_admin": False} # Default to non-admin
        access_token = create_access_token(identity=user.id, additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=user.id, additional_claims=additional_claims)

        log.info(f"User {user.username} (ID: {user.id}) registered successfully.")
        return {
            "message": "User registered successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user_schema.dump(user)
        }, 201

@auth_ns.route('/login')
class UserLogin(Resource):
    @limiter.limit("10 per minute", error_message="Too many login attempts. Please try again later.")
    @auth_ns.expect(user_login_model, validate=True)
    @auth_ns.marshal_with(auth_success_model)
    @auth_ns.response(400, 'Validation Error')
    @auth_ns.response(401, 'Invalid Credentials')
    @auth_ns.response(500, 'Internal Server Error')
    def post(self):
        """Log in a user and return JWT tokens."""
        data = request.json
        try:
            user_data = user_login_schema.load(data)
        except Exception as e:
            log.warning(f"Login validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        user = User.query.filter_by(email=user_data.email).first()

        if user and user.check_password(data['password']):
            # Create JWT tokens
            additional_claims = {"is_admin": False} # In a real app, this would come from a user role table
            access_token = create_access_token(identity=user.id, additional_claims=additional_claims)
            refresh_token = create_refresh_token(identity=user.id, additional_claims=additional_claims)

            log.info(f"User {user.username} (ID: {user.id}) logged in successfully.")
            return {
                "message": "Logged in successfully",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user_schema.dump(user)
            }, 200
        else:
            log.warning(f"Failed login attempt for email: {user_data.email}")
            raise UnauthorizedError("Invalid credentials.")

@auth_ns.route('/refresh')
class TokenRefresh(Resource):
    @jwt_required(refresh=True)
    @auth_ns.marshal_with(token_refresh_model)
    @auth_ns.response(401, 'Unauthorized (Refresh token missing or invalid)')
    @auth_ns.response(500, 'Internal Server Error')
    def post(self):
        """Refresh an expired access token using a refresh token."""
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        new_access_token = create_access_token(identity=current_user_id, additional_claims=claims, fresh=False)
        log.info(f"Access token refreshed for user ID: {current_user_id}.")
        return {"access_token": new_access_token}, 200

# Placeholder for logout functionality (token revocation not fully implemented)
# In a real app, you would blacklist tokens
# @auth_ns.route('/logout')
# class UserLogout(Resource):
#     @jwt_required()
#     def post(self):
#         jti = get_jwt()['jti']
#         # Blacklist the token here (e.g., store JTI in Redis with expiration)
#         return {"message": "Successfully logged out"}, 200