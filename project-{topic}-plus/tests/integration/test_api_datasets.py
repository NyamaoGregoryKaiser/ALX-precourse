import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import Base, async_session, engine
from app.core.deps import get_db
from app.core.security import get_password_hash
from app.models.user import User as DBUser
from app.models.dataset import Dataset as DBDataset
from app.schemas.dataset import DatasetCreate, DatasetUpdate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from typing import AsyncGenerator

# Use an in-memory SQLite database for integration tests
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(name="test_db_session")
async def test_db_session_fixture():
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
        yield session

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()

@pytest.fixture(name="client")
async def client_fixture(test_db_session: AsyncSession):
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture(name="superuser_token")
async def superuser_token_fixture(client: AsyncClient, test_db_session: AsyncSession):
    hashed_password = get_password_hash("adminpassword")
    superuser = DBUser(
        email="admin@example.com",
        hashed_password=hashed_password,
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
    )
    test_db_session.add(superuser)
    await test_db_session.commit()
    await test_db_session.refresh(superuser)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": superuser.email, "password": "adminpassword"}
    )
    return response.json()["access_token"]

@pytest.fixture(name="normal_user_token")
async def normal_user_token_fixture(client: AsyncClient, test_db_session: AsyncSession):
    hashed_password = get_password_hash("userpassword")
    normal_user = DBUser(
        email="user@example.com",
        hashed_password=hashed_password,
        full_name="Normal User",
        is_active=True,
        is_superuser=False,
    )
    test_db_session.add(normal_user)
    await test_db_session.commit()
    await test_db_session.refresh(normal_user)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": normal_user.email, "password": "userpassword"}
    )
    return response.json()["access_token"]

@pytest.fixture(name="another_user_token")
async def another_user_token_fixture(client: AsyncClient, test_db_session: AsyncSession):
    hashed_password = get_password_hash("anotheruserpassword")
    another_user = DBUser(
        email="another@example.com",
        hashed_password=hashed_password,
        full_name="Another User",
        is_active=True,
        is_superuser=False,
    )
    test_db_session.add(another_user)
    await test_db_session.commit()
    await test_db_session.refresh(another_user)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": another_user.email, "password": "anotheruserpassword"}
    )
    return response.json()["access_token"]

# Helper to create a dataset for tests
async def create_test_dataset(
    client: AsyncClient,
    token: str,
    name: str = "Test Dataset",
    file_path: str = "s3://test/path/data.csv",
    description: str = "A test dataset"
):
    dataset_data = DatasetCreate(
        name=name,
        description=description,
        file_path=file_path,
        file_type="csv",
        rows_count=100,
        columns_count=5
    )
    response = await client.post(
        "/api/v1/datasets/",
        json=dataset_data.model_dump(),
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    return response.json()

# --- Test /api/v1/datasets/ (GET) ---
@pytest.mark.asyncio
async def test_read_datasets_as_normal_user(client: AsyncClient, normal_user_token: str, superuser_token: str):
    await create_test_dataset(client, normal_user_token, name="User's Dataset")
    await create_test_dataset(client, superuser_token, name="Admin's Dataset")

    response = await client.get(
        "/api/v1/datasets/",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 200
    datasets = response.json()
    assert len(datasets) == 2
    assert any(d["name"] == "User's Dataset" for d in datasets)
    assert any(d["name"] == "Admin's Dataset" for d in datasets)

# --- Test /api/v1/datasets/ (POST) ---
@pytest.mark.asyncio
async def test_create_dataset_success(client: AsyncClient, normal_user_token: str):
    dataset_data = DatasetCreate(
        name="New Dataset by User",
        description="A new dataset.",
        file_path="s3://path/to/new_data.json",
        file_type="json"
    )
    response = await client.post(
        "/api/v1/datasets/",
        json=dataset_data.model_dump(),
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 201
    created_dataset = response.json()
    assert created_dataset["name"] == dataset_data.name
    assert created_dataset["uploaded_by_id"] is not None

@pytest.mark.asyncio
async def test_create_dataset_duplicate_name(client: AsyncClient, normal_user_token: str):
    await create_test_dataset(client, normal_user_token, name="Duplicate Name Dataset")
    
    dataset_data = DatasetCreate(
        name="Duplicate Name Dataset",
        file_path="s3://path/to/another_data.json"
    )
    response = await client.post(
        "/api/v1/datasets/",
        json=dataset_data.model_dump(),
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 409
    assert response.json() == {"detail": "Dataset with name 'Duplicate Name Dataset' already exists."}

# --- Test /api/v1/datasets/{dataset_id} (GET) ---
@pytest.mark.asyncio
async def test_read_dataset_by_id_success(client: AsyncClient, normal_user_token: str):
    created_dataset = await create_test_dataset(client, normal_user_token)

    response = await client.get(
        f"/api/v1/datasets/{created_dataset['id']}",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 200
    dataset = response.json()
    assert dataset["id"] == created_dataset["id"]
    assert dataset["name"] == created_dataset["name"]

@pytest.mark.asyncio
async def test_read_dataset_by_id_not_found(client: AsyncClient, normal_user_token: str):
    response = await client.get(
        "/api/v1/datasets/9999",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Dataset not found"}

# --- Test /api/v1/datasets/{dataset_id} (PUT) ---
@pytest.mark.asyncio
async def test_update_dataset_by_owner_success(client: AsyncClient, normal_user_token: str, test_db_session: AsyncSession):
    created_dataset = await create_test_dataset(client, normal_user_token)

    update_data = DatasetUpdate(description="Updated description by owner", rows_count=150)
    response = await client.put(
        f"/api/v1/datasets/{created_dataset['id']}",
        json=update_data.model_dump(exclude_unset=True),
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 200
    updated_dataset = response.json()
    assert updated_dataset["id"] == created_dataset["id"]
    assert updated_dataset["description"] == "Updated description by owner"
    assert updated_dataset["rows_count"] == 150

@pytest.mark.asyncio
async def test_update_dataset_by_superuser_success(client: AsyncClient, superuser_token: str, normal_user_token: str):
    created_dataset = await create_test_dataset(client, normal_user_token) # Created by normal user

    update_data = DatasetUpdate(description="Updated by superuser")
    response = await client.put(
        f"/api/v1/datasets/{created_dataset['id']}",
        json=update_data.model_dump(exclude_unset=True),
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    updated_dataset = response.json()
    assert updated_dataset["description"] == "Updated by superuser"

@pytest.mark.asyncio
async def test_update_dataset_by_non_owner_forbidden(client: AsyncClient, normal_user_token: str, another_user_token: str):
    created_dataset = await create_test_dataset(client, normal_user_token) # Created by normal user

    update_data = DatasetUpdate(description="Attempt to update")
    response = await client.put(
        f"/api/v1/datasets/{created_dataset['id']}",
        json=update_data.model_dump(exclude_unset=True),
        headers={"Authorization": f"Bearer {another_user_token}"} # Another user
    )
    assert response.status_code == 403
    assert response.json() == {"detail": "Not enough privileges to update this dataset."}

@pytest.mark.asyncio
async def test_update_dataset_duplicate_name(client: AsyncClient, normal_user_token: str, test_db_session: AsyncSession):
    dataset1 = await create_test_dataset(client, normal_user_token, name="Dataset One")
    dataset2 = await create_test_dataset(client, normal_user_token, name="Dataset Two", file_path="s3://path/two.csv")

    update_data = DatasetUpdate(name="Dataset One") # Try to rename dataset2 to dataset1's name
    response = await client.put(
        f"/api/v1/datasets/{dataset2['id']}",
        json=update_data.model_dump(exclude_unset=True),
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 409
    assert response.json() == {"detail": "Dataset with name 'Dataset One' already exists."}


# --- Test /api/v1/datasets/{dataset_id} (DELETE) ---
@pytest.mark.asyncio
async def test_delete_dataset_as_superuser_success(client: AsyncClient, superuser_token: str, normal_user_token: str):
    created_dataset = await create_test_dataset(client, normal_user_token) # Created by normal user

    response = await client.delete(
        f"/api/v1/datasets/{created_dataset['id']}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    deleted_dataset = response.json()
    assert deleted_dataset["id"] == created_dataset["id"]

    # Verify dataset is truly deleted
    check_response = await client.get(
        f"/api/v1/datasets/{created_dataset['id']}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert check_response.status_code == 404

@pytest.mark.asyncio
async def test_delete_dataset_as_normal_user_forbidden(client: AsyncClient, normal_user_token: str):
    created_dataset = await create_test_dataset(client, normal_user_token) # Created by normal user

    response = await client.delete(
        f"/api/v1/datasets/{created_dataset['id']}",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 403
    assert response.json() == {"detail": "Not enough privileges to delete this dataset."}