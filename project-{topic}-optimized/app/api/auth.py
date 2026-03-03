from flask import request, jsonify, current_app
from app.api import bp
from app.schemas.auth import RegisterSchema, LoginSchema, TokenSchema
from app.auth.services import AuthService
from pydantic import ValidationError
from app.utils.errors import BadRequestError, UnauthorizedError
from app import limiter

@bp.route('/auth/register', methods=['POST'])
@limiter.limit("5 per hour", error_message="Too many registration attempts. Please try again later.")
def register():
    try:
        data = RegisterSchema(**request.json)
    except ValidationError as e:
        raise BadRequestError("Invalid registration data", payload=e.errors())

    AuthService.register_user(data.username, data.email, data.password)
    return jsonify({"message": "User registered successfully."}), 201

@bp.route('/auth/login', methods=['POST'])
@limiter.limit("10 per hour", error_message="Too many login attempts. Please try again later.")
def login():
    try:
        data = LoginSchema(**request.json)
    except ValidationError as e:
        raise BadRequestError("Invalid login data", payload=e.errors())

    token = AuthService.authenticate_user(data.username, data.password)
    current_app.logger.info(f"User {data.username} logged in, token generated.")
    return TokenSchema(access_token=token).model_dump(), 200
```