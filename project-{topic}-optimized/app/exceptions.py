from fastapi import HTTPException, status

class CredentialException(HTTPException):
    """
    Custom exception for authentication/authorization failures.
    """
    def __init__(self, detail: str = "Could not validate credentials", status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail=detail, headers={"WWW-Authenticate": "Bearer"})

class CustomHTTPException(HTTPException):
    """
    A generic custom HTTP exception for more structured error responses.
    """
    def __init__(self, status_code: int, detail: str, errors: list = None):
        super().__init__(status_code=status_code, detail=detail)
        self.errors = errors if errors is not None else []
```