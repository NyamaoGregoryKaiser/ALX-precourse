```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import User
from backend.app.schemas.chat import ChatCreate, ChatUpdate
from backend.app.crud.chat import chat as crud_chat

@pytest.mark.asyncio
async def test_create_group_chat(authenticated_client: AsyncClient, test_user: User, second_user: User):
    chat_data = {
        "name": "Test Group Chat",
        "is_group": True,
        "member_ids": [second_user.id]
    }
    response = await authenticated_client.post("/api/v1/chats/", json=chat_data)
    assert response.status_code == 201
    new_chat = response.json()
    assert new_chat["name"] == "Test Group Chat"
    assert new_chat["is_group"] is True
    assert len(new_chat["members"]) == 2 # test_user (creator) + second_user

@pytest.mark.asyncio
async def test_get_user_chats(authenticated_client: AsyncClient, test_user: User, second_user: User, override_get_db: AsyncSession):
    # Create a chat for test_user
    await crud_chat.create_chat_with_members(
        override_get_db,
        obj_in=ChatCreate(name="My First Chat", is_group=True, member_ids=[second_user.id]),
        creator_id=test_user.id
    )
    # Create another chat where test_user is not a member (should not show up)
    await crud_chat.create_chat_with_members(
        override_get_db,
        obj_in=ChatCreate(name="Other Chat", is_group=True, member_ids=[]),
        creator_id=second_user.id
    )

    response = await authenticated_client.get("/api/v1/chats/")
    assert response.status_code == 200
    chats = response.json()
    assert len(chats) >= 1 # At least "My First Chat"
    assert any(c["name"] == "My First Chat" for c in chats)
    assert not any(c["name"] == "Other Chat" for c in chats)

@pytest.mark.asyncio
async def test_get_chat_by_id(authenticated_client: AsyncClient, test_user: User, second_user: User, override_get_db: AsyncSession):
    chat = await crud_chat.create_chat_with_members(
        override_get_db,
        obj_in=ChatCreate(name="Specific Chat", is_group=True, member_ids=[second_user.id]),
        creator_id=test_user.id
    )

    response = await authenticated_client.get(f"/api/v1/chats/{chat.id}")
    assert response.status_code == 200
    retrieved_chat = response.json()
    assert retrieved_chat["id"] == chat.id
    assert retrieved_chat["name"] == "Specific Chat"

@pytest.mark.asyncio
async def test_get_chat_by_id_unauthorized(authenticated_client: AsyncClient, second_user: User, override_get_db: AsyncSession):
    # Create a chat where current_user (test_user) is NOT a member
    chat = await crud_chat.create_chat_with_members(
        override_get_db,
        obj_in=ChatCreate(name="Forbidden Chat", is_group=True, member_ids=[]),
        creator_id=second_user.id # second_user is creator, not test_user
    )

    response = await authenticated_client.get(f"/api/v1/chats/{chat.id}")
    assert response.status_code == 404
    assert "Chat not found or user not a member" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_chat(authenticated_client: AsyncClient, test_user: User, override_get_db: AsyncSession):
    chat = await crud_chat.create_chat_with_members(
        override_get_db,
        obj_in=ChatCreate(name="Chat to Update", is_group=True, member_ids=[]),
        creator_id=test_user.id
    )

    update_data = {"name": "Updated Chat Name", "is_group": False}
    response = await authenticated_client.put(f"/api/v1/chats/{chat.id}", json=update_data)
    assert response.status_code == 200
    updated_chat = response.json()
    assert updated_chat["name"] == "Updated Chat Name"
    assert updated_chat["is_group"] is False

@pytest.mark.asyncio
async def test_delete_chat(authenticated_client: AsyncClient, test_user: User, override_get_db: AsyncSession):
    chat = await crud_chat.create_chat_with_members(
        override_get_db,
        obj_in=ChatCreate(name="Chat to Delete", is_group=True, member_ids=[]),
        creator_id=test_user.id
    )

    response = await authenticated_client.delete(f"/api/v1/chats/{chat.id}")
    assert response.status_code == 204

    # Verify it's deleted from DB
    deleted_chat = await crud_chat.get(override_get_db, id=chat.id)
    assert deleted_chat is None
```