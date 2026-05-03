```python
"""
Pydantic schemas for JWT tokens.

This module defines the data structures used for representing JWT access and refresh tokens
in API responses.
"""

from pydantic import BaseModel, Field

class Token(BaseModel):
    """
    Pydantic schema for an authentication token response.

    Attributes:
        access_token (str): The JWT access token.
        token_type (str): The type of the token, typically "bearer".
        refresh_token (str): The JWT refresh token, used to obtain new access tokens.
    """
    access_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    token_type: str = Field("bearer", example="bearer")
    refresh_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")

class TokenData(BaseModel):
    """
    Pydantic schema for the data contained within a JWT token payload.

    Attributes:
        username (str | None): The subject of the token, typically the user's email.
        scopes (list[str]): List of scopes/roles associated with the token.
    """
    username: str | None = None
    scopes: list[str] = []

```