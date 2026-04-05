from django.shortcuts import render
from django.template import RequestContext
from rest_framework.views import exception_handler
import logging

logger = logging.getLogger(__name__)

def custom_404(request, exception=None):
    """
    Custom 404 error handler.
    """
    logger.warning(f"404 Not Found: {request.path}")
    response = render(request, '404.html', {})
    response.status_code = 404
    return response

def custom_500(request):
    """
    Custom 500 error handler.
    """
    logger.exception("500 Server Error occurred.")
    response = render(request, '500.html', {})
    response.status_code = 500
    return response

def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler to log errors.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add some logging to it
    if response is not None:
        logger.error(f"API Error ({response.status_code}): {exc}", exc_info=True, extra={
            'request_method': context['request'].method,
            'request_path': context['request'].path,
        })
    else:
        logger.error(f"Unhandled API Error: {exc}", exc_info=True, extra={
            'request_method': context['request'].method,
            'request_path': context['request'].path,
        })
    return response
```