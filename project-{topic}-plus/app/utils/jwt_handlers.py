```python
from flask import jsonify, current_app
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_identity, create_access_token, create_refresh_token
from datetime import timedelta
from app.extensions import jwt
from app.models.user import User # Assuming User model is needed for identity
from app.utils.errors import TokenExpiredError, InvalidTokenError, RevokedTokenError, UnauthorizedError
import logging

# A simple set to store revoked tokens. In a real app, this would be Redis/database.
REVOKED_TOKENS = set()

def configure_jwt_callbacks(app):
    """
    Configures JWT error handlers and token loaders.
    """
    app.logger.info("Configuring JWT callbacks.")

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """
        Callback function that Flask-JWT-Extended will call when a protected endpoint
        is accessed. It will look up the user in the database using the identity
        contained in the JWT.
        """
        identity = jwt_data["sub"]
        return User.query.filter_by(id=identity).first()

    @jwt.token_verification_loader
    def custom_token_verification_callback(jwt_header, jwt_data):
        """
        Allows custom verification logic before the token's validity (signature, expiry) is checked.
        This is a pre-verification step.
        """
        # For example, you might check if the user is active here, or other custom claims
        # If this function returns anything other than True, the token is considered invalid.
        # Basic verification is handled by default by Flask-JWT-Extended.
        # For this example, we just pass through.
        return True

    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        """
        Callback function to check if a JWT has been revoked.
        The blocklist is a set of token UUIDs.
        """
        jti = jwt_payload["jti"]
        return jti in REVOKED_TOKENS

    # --- Error Handlers for JWT specific issues ---

    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        current_app.logger.warning(f"JWT Unauthorized: {callback}")
        return jsonify({"message": "Token not provided or invalid"}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        current_app.logger.warning(f"JWT Invalid Token: {callback}")
        return jsonify({"message": "Signature verification failed"}), 403

    @jwt.revoked_token_loader
    def revoked_token_response(jwt_header, jwt_payload):
        current_app.logger.warning(f"JWT Revoked Token: Token with JTI {jwt_payload['jti']} was revoked.")
        return jsonify({"message": "Token has been revoked"}), 401

    @jwt.claims_verification_failed_loader
    def claims_verification_failed_response(callback):
        current_app.logger.warning(f"JWT Claims Verification Failed: {callback}")
        return jsonify({"message": "Token claims verification failed"}), 400

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        current_app.logger.warning(f"JWT Expired Token: Token with JTI {jwt_payload['jti']} has expired.")
        return jsonify({"message": "Token has expired", "error": "token_expired"}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(jwt_header, jwt_payload):
        current_app.logger.warning(f"JWT Needs Fresh Token: Token with JTI {jwt_payload['jti']} needs to be refreshed.")
        return jsonify({"message": "Fresh token required"}), 401

def create_auth_tokens(user_id, user_role, fresh=False):
    """
    Creates access and refresh tokens for a given user.
    """
    access_expires = timedelta(seconds=current_app.config['JWT_ACCESS_TOKEN_EXPIRES'])
    refresh_expires = timedelta(days=current_app.config['JWT_REFRESH_TOKEN_EXPIRES'])

    additional_claims = {"role": user_role}

    access_token = create_access_token(identity=user_id, fresh=fresh, expires_delta=access_expires, additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=user_id, expires_delta=refresh_expires, additional_claims=additional_claims)
    
    current_app.logger.info(f"Tokens created for user ID: {user_id}, role: {user_role}")
    return access_token, refresh_token

def revoke_token(jti):
    """
    Adds a JWT's JTI to the blocklist.
    """
    REVOKED_TOKENS.add(jti
```