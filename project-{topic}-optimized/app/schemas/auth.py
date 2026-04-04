from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    """
    Pydantic model for JWT tokens (access and refresh).
    """
    access_token: str
    token_type: str
    refresh_token: str

class TokenData(BaseModel):
    """
    Pydantic model for data contained within a JWT token.
    """
    user_id: int | None = None
    email: EmailStr | None = None
    role: str | None = None

class LoginRequest(BaseModel):
    """
    Pydantic model for user login request.
    """
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    """
    Pydantic model for refresh token request.
    """
    refresh_token: str
```