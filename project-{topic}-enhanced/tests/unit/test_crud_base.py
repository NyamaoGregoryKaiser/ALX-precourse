```python
import pytest
from typing import Optional, List
from datetime import datetime, UTC

from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.base_class import Base
from app.crud.base import CRUDBase

# --- Define a Test Model and Schemas ---
class TestModel(Base):
    __tablename__ = "test_models"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(Integer, nullable=True) # For testing owner-related methods

class TestModelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: Optional[int] = None

class TestModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[int] = None

# --- Instantiate CRUD object for testing ---
crud_test_model = CRUDBase[TestModel, TestModelCreate, TestModelUpdate](TestModel)

@pytest.mark.asyncio
async def test_create_item(db_session: AsyncSession):
    item_in = TestModelCreate(name="Test Item 1", description="Description 1")
    item = await crud_test_model.create(db_session, obj_in=item_in)

    assert item.id is not None
    assert item.name == "Test Item 1"
    assert item.description == "Description 1"
    assert isinstance(item.created_at, datetime)
    assert isinstance(item.updated_at, datetime)

@pytest.mark.asyncio
async def test_get_item(db_session: AsyncSession):
    item_in = TestModelCreate(name="Test Item 2", description="Description 2")
    created_item = await crud_test_model.create(db_session, obj_in=item_in)

    fetched_item = await crud_test_model.get(db_session, id=created_item.id)
    assert fetched_item is not None
    assert fetched_item.id == created_item.id
    assert fetched_item.name == "Test Item 2"

    not_found_item = await crud_test_model.get(db_session, id=999)
    assert not_found_item is None

@pytest.mark.asyncio
async def test_get_multi_items(db_session: AsyncSession):
    await crud_test_model.create(db_session, obj_in=TestModelCreate(name="Multi Item 1"))
    await crud_test_model.create(db_session, obj_in=TestModelCreate(name="Multi Item 2"))
    await crud_test_model.create(db_session, obj_in=TestModelCreate(name="Multi Item 3"))

    items = await crud_test_model.get_multi(db_session, skip=0, limit=2)
    assert len(items) == 2
    assert isinstance(items, list)
    assert all(isinstance(item, TestModel) for item in items)

@pytest.mark.asyncio
async def test_update_item(db_session: AsyncSession):
    item_in = TestModelCreate(name="Original Name", description="Original Desc")
    created_item = await crud_test_model.create(db_session, obj_in=item_in)

    update_in = TestModelUpdate(name="Updated Name")
    updated_item = await crud_test_model.update(db_session, db_obj=created_item, obj_in=update_in)

    assert updated_item.name == "Updated Name"
    assert updated_item.description == "Original Desc"
    assert updated_item.updated_at > created_item.updated_at # Updated timestamp should be newer

    # Update with dictionary
    updated_item_dict = await crud_test_model.update(db_session, db_obj=updated_item, obj_in={"description": "New Desc"})
    assert updated_item_dict.description == "New Desc"

@pytest.mark.asyncio
async def test_remove_item(db_session: AsyncSession):
    item_in = TestModelCreate(name="Item to Remove")
    created_item = await crud_test_model.create(db_session, obj_in=item_in)

    removed_item = await crud_test_model.remove(db_session, id=created_item.id)
    assert removed_item is not None
    assert removed_item.id == created_item.id

    fetched_item = await crud_test_model.get(db_session, id=created_item.id)
    assert fetched_item is None

    # Attempt to remove non-existent item
    not_removed_item = await crud_test_model.remove(db_session, id=999)
    assert not_removed_item is None

@pytest.mark.asyncio
async def test_create_with_owner(db_session: AsyncSession):
    owner_id = 123
    item_in = TestModelCreate(name="Owner Item", owner_id=None) # owner_id set in method
    item = await crud_test_model.create_with_owner(db_session, obj_in=item_in, owner_id=owner_id)

    assert item.owner_id == owner_id
    assert item.name == "Owner Item"

@pytest.mark.asyncio
async def test_get_multi_by_owner(db_session: AsyncSession):
    owner1_id = 1
    owner2_id = 2

    await crud_test_model.create_with_owner(db_session, obj_in=TestModelCreate(name="Owner1 Item 1"), owner_id=owner1_id)
    await crud_test_model.create_with_owner(db_session, obj_in=TestModelCreate(name="Owner1 Item 2"), owner_id=owner1_id)
    await crud_test_model.create_with_owner(db_session, obj_in=TestModelCreate(name="Owner2 Item 1"), owner_id=owner2_id)

    owner1_items = await crud_test_model.get_multi_by_owner(db_session, owner_id=owner1_id)
    assert len(owner1_items) == 2
    assert all(item.owner_id == owner1_id for item in owner1_items)

    owner2_items = await crud_test_model.get_multi_by_owner(db_session, owner_id=owner2_id)
    assert len(owner2_items) == 1
    assert all(item.owner_id == owner2_id for item in owner2_items)

    no_owner_items = await crud_test_model.get_multi_by_owner(db_session, owner_id=999)
    assert len(no_owner_items) == 0

```