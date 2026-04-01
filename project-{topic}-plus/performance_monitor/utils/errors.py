```python
from flask import jsonify
from werkzeug.exceptions import HTTPException

def handle_api_error(e):
    """
    Custom error handler for Flask-RESTX API.
    Provides a consistent JSON error response.
    """
    code = getattr(e, 'code', 500)
    message = getattr(e, 'description', 'An unexpected API error occurred.')

    if isinstance(e, HTTPException):
        # Werkzeug HTTP errors (404, 400, etc.)
        response = {'message': message}
        if code == 400 and hasattr(e, 'data') and 'errors' in e.data:
            # Flask-RESTX validation errors will have 'errors' in data
            response['errors'] = e.data['errors']
    else:
        # Other exceptions
        code = 500
        response = {'message': 'Internal Server Error'}

    return jsonify(response), code

```