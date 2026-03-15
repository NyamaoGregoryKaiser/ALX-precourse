from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, decode_token
from app.services.auth_service import AuthService
from app.utils.errors import UnauthorizedError, BadRequestError, ConflictError
from app import limiter
import logging

auth_bp = Blueprint('auth_bp', __name__)
api = Api(auth_bp)
logger = logging.getLogger(__name__)

class Register(Resource):
    @limiter.limit("10 per hour") # Limit registration attempts
    def post(self):
        """
        User Registration
        ---
        parameters:
          - in: body
            name: body
            schema:
              type: object
              required:
                - username
                - email
                - password
              properties:
                username:
                  type: string
                  description: Unique username
                email:
                  type: string
                  format: email
                  description: User's email address
                password:
                  type: string
                  format: password
                  description: User's password
                role:
                  type: string
                  enum: ['customer', 'admin']
                  default: 'customer'
                  description: Role of the user (customer or admin)
        responses:
          201:
            description: User registered successfully
            schema:
              type: object
              properties:
                message:
                  type: string
                user_id:
                  type: integer
          400:
            description: Bad request (e.g., missing fields, invalid email)
          409:
            description: Conflict (e.g., username/email already exists)
        """
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'customer')

        if not username or not email or not password:
            raise BadRequestError("Missing username, email, or password.")
        
        # Basic email validation
        if "@" not in email or "." not in email:
            raise BadRequestError("Invalid email format.")

        try:
            user = AuthService.register_user(username, email, password, role)
            return {'message': 'User registered successfully', 'user_id': user.id}, 201
        except (BadRequestError, ConflictError) as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error during registration: {e}")
            raise BadRequestError(f"Registration failed: {e}")

class Login(Resource):
    @limiter.limit("5 per minute") # Limit login attempts
    def post(self):
        """
        User Login
        ---
        parameters:
          - in: body
            name: body
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  description: User's email address
                password:
                  type: string
                  format: password
                  description: User's password
        responses:
          200:
            description: Successfully logged in, returns access and refresh tokens
            schema:
              type: object
              properties:
                access_token:
                  type: string
                refresh_token:
                  type: string
          401:
            description: Invalid credentials
        """
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            raise BadRequestError("Missing email or password.")

        try:
            user = AuthService.authenticate_user(email, password)
            tokens = user.generate_tokens()
            return tokens, 200
        except UnauthorizedError as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error during login: {e}")
            raise BadRequestError(f"Login failed: {e}")

class RefreshToken(Resource):
    @jwt_required(refresh=True)
    def post(self):
        """
        Refresh Access Token
        ---
        security:
          - Bearer: []
        responses:
          200:
            description: New access token generated
            schema:
              type: object
              properties:
                access_token:
                  type: string
          401:
            description: Invalid or missing refresh token
        """
        current_user_identity = get_jwt_identity()
        access_token = create_access_token(identity=current_user_identity)
        return {'access_token': access_token}, 200

# Add resources to API
api.add_resource(Register, '/register')
api.add_resource(Login, '/login')
api.add_resource(RefreshToken, '/refresh')