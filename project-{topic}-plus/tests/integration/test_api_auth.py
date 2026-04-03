import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import Base, async_session, engine
from app.core.security import get_password_hash
from app.models.user import User as DBUser
from app.schemas.user import UserCreate

# Use a separate test database or mock for integration tests
# For simplicity, we'll reuse the in-memory setup, but in a real project
# you'd point to a dedicated test PostgreSQL container.
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(name="test_db_session")
async def test_db_session_fixture():
    # Setup for each test to ensure isolation
    test_engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
    )

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    
    async with TestingSessionLocal() as session:
        yield session # Yield the session for test execution

    # Teardown after each test
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()

@pytest.fixture(name="client")
async def client_fixture(test_db_session: AsyncSession):
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture(name="superuser_data")
async def superuser_data_fixture(test_db_session: AsyncSession):
    hashed_password = get_password_hash("adminpassword")
    user = DBUser(
        email="admin@example.com",
        hashed_password=hashed_password,
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user

@pytest.fixture(name="normal_user_data")
async def normal_user_data_fixture(test_db_session: AsyncSession):
    hashed_password = get_password_hash("userpassword")
    user = DBUser(
        email="user@example.com",
        hashed_password=hashed_password,
        full_name="Normal User",
        is_active=True,
        is_superuser=False,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_login_for_access_token_success(client: AsyncClient, superuser_data: DBUser):
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": superuser_data.email, "password": "adminpassword"}
    )
    assert response.status_code == 200
    token = response.json()
    assert "access_token" in token
    assert token["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_for_access_token_wrong_password(client: AsyncClient, superuser_data: DBUser):
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": superuser_data.email, "password": "wrongpassword"}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Incorrect email or password"}

@pytest.mark.asyncio
async def test_login_for_access_token_user_not_found(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "nonexistent@example.com", "password": "somepassword"}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Incorrect email or password"}

@pytest.mark.asyncio
async def test_login_for_access_token_inactive_user(client: AsyncClient, test_db_session: AsyncSession):
    hashed_password = get_password_hash("inactivepassword")
    inactive_user = DBUser(
        email="inactive@example.com",
        hashed_password=hashed_password,
        full_name="Inactive User",
        is_active=False,
        is_superuser=False,
    )
    test_db_session.add(inactive_user)
    await test_db_session.commit()
    await test_db_session.refresh(inactive_user)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": inactive_user.email, "password": "inactivepassword"}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Inactive user"}

@pytest.mark.asyncio
async def test_test_token_success(client: AsyncClient, superuser_data: DBUser):
    login_response = await client.post(
        "/api/v1/auth/token",
        data={"username": superuser_data.email, "password": "adminpassword"}
    )
    token = login_response.json()["access_token"]

    test_response = await client.post(
        "/api/v1/auth/test-token",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert test_response.status_code == 200
    user_data = test_response.json()
    assert user_data["email"] == superuser_data.email
    assert user_data["is_superuser"] is True

@pytest.mark.asyncio
async def test_test_token_invalid_token(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/test-token",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Could not validate credentials"}

@pytest.mark.asyncio
async def test_test_token_no_token(client: AsyncClient):
    response = await client.post("/api/v1/auth/test-token")
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}