import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.crud.dataset import crud_dataset
from app.crud.user import crud_user
from app.schemas.dataset import DatasetCreate, DatasetUpdate
from app.schemas.user import UserCreate
from app.models.dataset import Dataset
from app.models.user import User
from typing import AsyncGenerator

# Setup an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(name="test_engine")
async def test_engine_fixture():
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture(name="test_session")
async def test_session_fixture(test_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

@pytest.fixture(name="db_fixture")
async def db_fixture_override(test_session: AsyncSession):
    yield test_session

@pytest.fixture(name="owner_user")
async def owner_user_fixture(db_fixture: AsyncSession) -> User:
    user_in = UserCreate(email="owner@example.com", password="ownerpassword")
    user = await crud_user.create(db_fixture, obj_in=user_in)
    return user

@pytest.mark.asyncio
async def test_crud_dataset_create_with_owner(db_fixture: AsyncSession, owner_user: User):
    dataset_in = DatasetCreate(
        name="Test Dataset",
        description="A dataset for testing.",
        file_path="s3://bucket/test.csv",
        file_type="csv",
        rows_count=100,
        columns_count=5
    )
    dataset = await crud_dataset.create_with_owner(db_fixture, obj_in=dataset_in, owner_id=owner_user.id)

    assert dataset.id is not None
    assert dataset.name == "Test Dataset"
    assert dataset.uploaded_by_id == owner_user.id

@pytest.mark.asyncio
async def test_crud_dataset_get(db_fixture: AsyncSession, owner_user: User):
    dataset_in = DatasetCreate(name="Get Dataset", file_path="s3://get.csv")
    created_dataset = await crud_dataset.create_with_owner(db_fixture, obj_in=dataset_in, owner_id=owner_user.id)

    fetched_dataset = await crud_dataset.get(db_fixture, id=created_dataset.id)
    assert fetched_dataset is not None
    assert fetched_dataset.name == created_dataset.name

    not_found_dataset = await crud_dataset.get(db_fixture, id=999)
    assert not_found_dataset is None

@pytest.mark.asyncio
async def test_crud_dataset_get_by_name(db_fixture: AsyncSession, owner_user: User):
    dataset_name = "Name Dataset"
    dataset_in = DatasetCreate(name=dataset_name, file_path="s3://name.csv")
    await crud_dataset.create_with_owner(db_fixture, obj_in=dataset_in, owner_id=owner_user.id)

    fetched_dataset = await crud_dataset.get_by_name(db_fixture, name=dataset_name)
    assert fetched_dataset is not None
    assert fetched_dataset.name == dataset_name

    not_found_dataset = await crud_dataset.get_by_name(db_fixture, name="Nonexistent Dataset")
    assert not_found_dataset is None

@pytest.mark.asyncio
async def test_crud_dataset_update(db_fixture: AsyncSession, owner_user: User):
    dataset_in = DatasetCreate(name="Update Dataset", file_path="s3://update.csv")
    dataset_obj = await crud_dataset.create_with_owner(db_fixture, obj_in=dataset_in, owner_id=owner_user.id)

    dataset_update = DatasetUpdate(description="Updated description", file_size_bytes=200)
    updated_dataset = await crud_dataset.update(db_fixture, db_obj=dataset_obj, obj_in=dataset_update)

    assert updated_dataset.description == "Updated description"
    assert updated_dataset.file_size_bytes == 200

    # Update name
    dataset_update_name = DatasetUpdate(name="Renamed Dataset")
    updated_dataset_name = await crud_dataset.update(db_fixture, db_obj=dataset_obj, obj_in=dataset_update_name)
    assert updated_dataset_name.name == "Renamed Dataset"

@pytest.mark.asyncio
async def test_crud_dataset_remove(db_fixture: AsyncSession, owner_user: User):
    dataset_in = DatasetCreate(name="Delete Dataset", file_path="s3://delete.csv")
    dataset_obj = await crud_dataset.create_with_owner(db_fixture, obj_in=dataset_in, owner_id=owner_user.id)

    removed_dataset = await crud_dataset.remove(db_fixture, id=dataset_obj.id)
    assert removed_dataset is not None
    assert removed_dataset.name == dataset_obj.name

    fetched_dataset = await crud_dataset.get(db_fixture, id=dataset_obj.id)
    assert fetched_dataset is None

@pytest.mark.asyncio
async def test_crud_dataset_get_multi(db_fixture: AsyncSession, owner_user: User):
    await crud_dataset.create_with_owner(db_fixture, obj_in=DatasetCreate(name="D1", file_path="s3://d1.csv"), owner_id=owner_user.id)
    await crud_dataset.create_with_owner(db_fixture, obj_in=DatasetCreate(name="D2", file_path="s3://d2.csv"), owner_id=owner_user.id)

    datasets = await crud_dataset.get_multi(db_fixture, skip=0, limit=1)
    assert len(datasets) == 1
    assert datasets[0].name == "D1"

    all_datasets = await crud_dataset.get_multi(db_fixture, skip=0, limit=100)
    assert len(all_datasets) == 2

@pytest.mark.asyncio
async def test_crud_dataset_get_multi_by_owner(db_fixture: AsyncSession, owner_user: User):
    user2_in = UserCreate(email="owner2@example.com", password="owner2password")
    owner_user2 = await crud_user.create(db_fixture, obj_in=user2_in)

    await crud_dataset.create_with_owner(db_fixture, obj_in=DatasetCreate(name="D_Owner1_1", file_path="s3://o1_1.csv"), owner_id=owner_user.id)
    await crud_dataset.create_with_owner(db_fixture, obj_in=DatasetCreate(name="D_Owner1_2", file_path="s3://o1_2.csv"), owner_id=owner_user.id)
    await crud_dataset.create_with_owner(db_fixture, obj_in=DatasetCreate(name="D_Owner2_1", file_path="s3://o2_1.csv"), owner_id=owner_user2.id)

    datasets_owner1 = await crud_dataset.get_multi_by_owner(db_fixture, owner_id=owner_user.id)
    assert len(datasets_owner1) == 2
    assert all(d.uploaded_by_id == owner_user.id for d in datasets_owner1)

    datasets_owner2 = await crud_dataset.get_multi_by_owner(db_fixture, owner_id=owner_user2.id)
    assert len(datasets_owner2) == 1
    assert all(d.uploaded_by_id == owner_user2.id for d in datasets_owner2)

    no_datasets = await crud_dataset.get_multi_by_owner(db_fixture, owner_id=999)
    assert len(no_datasets) == 0