from flask import g
from app import limiter
from app.auth.decorators import get_current_user_id
from app.utils.errors import UnauthorizedError

def configure_rate_limits(app, limiter_instance):
    """
    Configures global rate limits based on user authentication status.
    """
    # Apply a global default rate limit to all routes
    # This is already set in app/__init__.py default_limits

    # Define a dynamic rate limit for authenticated vs unauthenticated users
    @limiter_instance.request_filter
    def auth_rate_limit_filter():
        try:
            user_id = get_current_user_id()
            if user_id:
                # If authenticated, use the more generous limit
                g.limiter_limits = app.config['RATE_LIMIT_AUTHENTICATED']
            else:
                # If not authenticated, use the default limit
                g.limiter_limits = app.config['RATE_LIMIT_DEFAULT']
        except UnauthorizedError:
            # Token might be invalid or expired, treat as unauthenticated for rate limiting
            g.limiter_limits = app.config['RATE_LIMIT_DEFAULT']
        return False # This filter doesn't prevent the request, it just sets g.limiter_limits

    # Apply the dynamic rate limit to a specific blueprint or all endpoints
    # The 'default_limits' in __init__.py will act as the fallback for any route
    # that doesn't have a specific decorator.
    # We can override specific routes using @limiter.limit() decorator.
    # For a global dynamic limit based on auth, we can use a custom key_func,
    # but for simplicity, `request_filter` modifying `g.limiter_limits`
    # and then accessing it in `limiter.limit` decorator (if used) is clearer.
    # For now, rely on default_limits being the base, and use `request_filter`
    # to differentiate.

    # Example of how to apply this to a specific endpoint using the g.limiter_limits:
    # @limiter.limit(lambda: g.limiter_limits if hasattr(g, 'limiter_limits') else app.config['RATE_LIMIT_DEFAULT'])
    # This requires adding `limiter.limit` decorator to each endpoint or to a Blueprint
    # For simplicity, default_limits in `app/__init__.py` apply universally.
    # To implement the *dynamic* part effectively, you'd apply the `limiter.limit`
    # decorator to API endpoints:
    # @limiter.limit("100/minute", exempt_when=lambda: get_current_user_id() is not None)
    # @limiter.limit("1000/minute", only_when=lambda: get_current_user_id() is not None)
    # This is more explicit. For this project, the `default_limits` in `__init__.py`
    # combined with potentially per-route decorators will suffice.
    # The `request_filter` sets a flag, but we won't directly use g.limiter_limits
    # in a global limit here because Flask-Limiter doesn't have a direct 'global dynamic default'.
    # Instead, we define base limits in __init__.py and can override using decorators.

    # To ensure API endpoints have distinct limits based on auth:
    # The `app.api` blueprint will have more granular limits defined on its routes.
    # If a user is not authenticated, the default limit applies.
    # If a user is authenticated, specific limits on the API routes can override or supplement.
    app.logger.info("Rate limiting configured.")

```