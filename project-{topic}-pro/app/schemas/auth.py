from pydantic import BaseModel, EmailStr, Field

"""
Pydantic schemas for Authentication related data.
These define the data structures for login, token responses.
"""

class Token(BaseModel):
    """Schema for JWT tokens."""
    access_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description="JWT access token")
    token_type: str = Field("bearer", example="bearer", description="Type of the token (Bearer)")
    refresh_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description="JWT refresh token")
    expires_in: int = Field(..., example=1800, description="Access token expiration in seconds")

class TokenData(BaseModel):
    """Schema for the payload extracted from a JWT token."""
    user_id: int = Field(..., example=1, description="User ID extracted from the token")
    # You can add other claims here like 'scopes' or 'roles'

class UserLogin(BaseModel):
    """Schema for user login credentials."""
    email: EmailStr = Field(..., example="john.doe@example.com", description="User's email address")
    password: str = Field(..., example="securepassword123", description="User's password")

class RefreshTokenRequest(BaseModel):
    """Schema for requesting a new access token using a refresh token."""
    refresh_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description="Refresh token")
```

```