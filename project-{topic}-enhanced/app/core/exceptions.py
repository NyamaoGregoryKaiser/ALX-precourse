```python
from fastapi import status

class CustomException(Exception):
    def __init__(self, name: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.name = name
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class AuthException(CustomException):
    def __init__(self, message: str = "Authentication failed", status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__("AuthenticationError", message, status_code)

class NotFoundException(CustomException):
    def __init__(self, message: str = "Resource not found", status_code: int = status.HTTP_404_NOT_FOUND):
        super().__init__("NotFoundError", message, status_code)

class ForbiddenException(CustomException):
    def __init__(self, message: str = "Access forbidden", status_code: int = status.HTTP_403_FORBIDDEN):
        super().__init__("ForbiddenError", message, status_code)

class ConflictException(CustomException):
    def __init__(self, message: str = "Resource already exists or conflicts with existing data", status_code: int = status.HTTP_409_CONFLICT):
        super().__init__("ConflictError", message, status_code)

class PaymentGatewayException(CustomException):
    def __init__(self, message: str = "Payment gateway error", status_code: int = status.HTTP_502_BAD_GATEWAY):
        super().__init__("PaymentGatewayError", message, status_code)

```