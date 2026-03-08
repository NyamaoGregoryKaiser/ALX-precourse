```python
import pytest
from httpx import AsyncClient
from app.schemas.chat_room import ChatRoomCreate, ChatRoomPublic, ChatRoomUpdate
from app.schemas.message import MessagePublic, MessageCreate
from app.models.chat_room import ChatRoom
from app.models.user import User
from app.crud.chat_room import crud_chat_room
from app.crud.user import crud_user
from app.core.db import AsyncSessionLocal
import json
import asyncio
from websockets.client import connect as ws_connect
from app.services.websocket_manager import websocket_manager # For checking manager state


@pytest.fixture
async def create_another_user(db_session: AsyncSession) -> User:
    """Fixture to create a second test user."""
    user_data = {
        "username": "anotheruser",
        "email": "another@example.com",
        "password": "password123",
        "full_name": "Another User",
    }
    user = await crud_user.create(db_session, obj_in=user_data)
    user.hashed_password = "dummy_hashed_password" # Set dummy for schema validation, not actual hash
    return user

@pytest.fixture
async def create_chat_room(db_session: AsyncSession, create_test_user: User) -> ChatRoom:
    """Fixture to create and return a test chat room."""
    room_data = ChatRoomCreate(name="test_room", description="A room for testing.", is_private=False)
    room = await crud_chat_room.create(db_session, obj_in={**room_data.model_dump(), "owner_id": create_test_user.id})
    await crud_chat_room.add_member(db_session, room=room, user=create_test_user) # Add owner as member
    await db_session.refresh(room, attribute_names=["owner", "members"])
    return room

@pytest.fixture
async def create_private_room(db_session: AsyncSession, create_test_user: User) -> ChatRoom:
    """Fixture to create and return a private test chat room."""
    room_data = ChatRoomCreate(name="private_room", description="A private room.", is_private=True)
    room = await crud_chat_room.create(db_session, obj_in={**room_data.model_dump(), "owner_id": create_test_user.id})
    await crud_chat_room.add_member(db_session, room=room, user=create_test_user) # Add owner as member
    await db_session.refresh(room, attribute_names=["owner", "members"])
    return room


@pytest.mark.asyncio
async def test_create_chat_room(client: AsyncClient, auth_headers: dict, create_test_user: User):
    room_data = {"name": "new_room", "description": "A brand new room", "is_private": False}
    response = await client.post("/api/v1/rooms/", headers=auth_headers, json=room_data)
    assert response.status_code == 201
    room_out = ChatRoomPublic(**response.json())
    assert room_out.name == room_data["name"]
    assert room_out.owner.id == create_test_user.id
    assert room_out.is_private == room_data["is_private"]
    assert len(room_out.members) == 1
    assert room_out.members[0].id == create_test_user.id

@pytest.mark.asyncio
async def test_create_chat_room_duplicate_name(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom):
    room_data = {"name": create_chat_room.name, "description": "Duplicate room", "is_private": False}
    response = await client.post("/api/v1/rooms/", headers=auth_headers, json=room_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Chat room with this name already exists"

@pytest.mark.asyncio
async def test_read_public_chat_rooms(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom, create_private_room: ChatRoom):
    response = await client.get("/api/v1/rooms/", headers=auth_headers)
    assert response.status_code == 200
    rooms = [ChatRoomPublic(**r) for r in response.json()]
    assert any(room.name == create_chat_room.name for room in rooms)
    assert not any(room.name == create_private_room.name for room in rooms) # Private room should not be listed publicly

@pytest.mark.asyncio
async def test_read_chat_room_public(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom):
    response = await client.get(f"/api/v1/rooms/{create_chat_room.id}", headers=auth_headers)
    assert response.status_code == 200
    room_out = ChatRoomPublic(**response.json())
    assert room_out.name == create_chat_room.name
    assert room_out.description == create_chat_room.description
    assert room_out.owner.id == create_chat_room.owner_id
    assert len(room_out.members) == 1 # Only owner is member by default on creation

@pytest.mark.asyncio
async def test_read_chat_room_private_as_owner(client: AsyncClient, auth_headers: dict, create_private_room: ChatRoom):
    response = await client.get(f"/api/v1/rooms/{create_private_room.id}", headers=auth_headers)
    assert response.status_code == 200
    room_out = ChatRoomPublic(**response.json())
    assert room_out.name == create_private_room.name
    assert room_out.is_private is True

@pytest.mark.asyncio
async def test_read_chat_room_private_unauthorized(client: AsyncClient, auth_headers: dict, create_private_room: ChatRoom, create_another_user: User):
    # Log in as another user
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]
    another_user_headers = {"Authorization": f"Bearer {another_user_token}"}

    response = await client.get(f"/api/v1/rooms/{create_private_room.id}", headers=another_user_headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to access this private chat room"


@pytest.mark.asyncio
async def test_update_chat_room(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom):
    update_data = {"description": "Updated room description", "is_private": True}
    response = await client.patch(f"/api/v1/rooms/{create_chat_room.id}", headers=auth_headers, json=update_data)
    assert response.status_code == 200
    room_out = ChatRoomPublic(**response.json())
    assert room_out.description == update_data["description"]
    assert room_out.is_private == update_data["is_private"]

@pytest.mark.asyncio
async def test_update_chat_room_unauthorized(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom, create_another_user: User):
    # Log in as another user who is not the owner
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]
    another_user_headers = {"Authorization": f"Bearer {another_user_token}"}

    update_data = {"description": "Attempted update"}
    response = await client.patch(f"/api/v1/rooms/{create_chat_room.id}", headers=another_user_headers, json=update_data)
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to update this chat room"

@pytest.mark.asyncio
async def test_delete_chat_room(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom):
    room_id = create_chat_room.id
    response = await client.delete(f"/api/v1/rooms/{room_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify deletion from DB
    async with AsyncSessionLocal() as db:
        deleted_room = await crud_chat_room.get(db, room_id)
        assert deleted_room is None

@pytest.mark.asyncio
async def test_delete_chat_room_unauthorized(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom, create_another_user: User):
    # Log in as another user who is not the owner
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]
    another_user_headers = {"Authorization": f"Bearer {another_user_token}"}

    response = await client.delete(f"/api/v1/rooms/{create_chat_room.id}", headers=another_user_headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this chat room"

@pytest.mark.asyncio
async def test_join_chat_room(client: AsyncClient, create_chat_room: ChatRoom, create_another_user: User):
    # Login as create_another_user to get their token
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]
    another_user_headers = {"Authorization": f"Bearer {another_user_token}"}

    response = await client.post(f"/api/v1/rooms/{create_chat_room.id}/join", headers=another_user_headers)
    assert response.status_code == 200
    room_out = ChatRoomPublic(**response.json())
    assert len(room_out.members) == 2
    assert any(m.id == create_another_user.id for m in room_out.members)

    # Verify in DB
    async with AsyncSessionLocal() as db:
        is_member = await crud_chat_room.is_member(db, create_chat_room.id, create_another_user.id)
        assert is_member is True

@pytest.mark.asyncio
async def test_join_private_chat_room_unauthorized(client: AsyncClient, create_private_room: ChatRoom, create_another_user: User):
    # Login as create_another_user to get their token
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]
    another_user_headers = {"Authorization": f"Bearer {another_user_token}"}

    response = await client.post(f"/api/v1/rooms/{create_private_room.id}/join", headers=another_user_headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Cannot join private rooms without explicit invite (future feature)"


@pytest.mark.asyncio
async def test_leave_chat_room(client: AsyncClient, create_chat_room: ChatRoom, create_another_user: User, db_session: AsyncSession):
    # Add another user to the room first
    await crud_chat_room.add_member(db_session, room=create_chat_room, user=create_another_user)
    await db_session.refresh(create_chat_room, attribute_names=["members"]) # Refresh to load members
    assert len(create_chat_room.members) == 2

    # Login as create_another_user to get their token
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]
    another_user_headers = {"Authorization": f"Bearer {another_user_token}"}

    response = await client.post(f"/api/v1/rooms/{create_chat_room.id}/leave", headers=another_user_headers)
    assert response.status_code == 204

    # Verify in DB
    async with AsyncSessionLocal() as db:
        is_member = await crud_chat_room.is_member(db, create_chat_room.id, create_another_user.id)
        assert is_member is False


@pytest.mark.asyncio
async def test_send_message_to_room(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom, create_test_user: User):
    message_data = MessageCreate(content="This is a test message.")
    response = await client.post(f"/api/v1/messages/{create_chat_room.id}", headers=auth_headers, json=message_data.model_dump())
    assert response.status_code == 201
    message_out = MessagePublic(**response.json())
    assert message_out.content == message_data.content
    assert message_out.chat_room_id == create_chat_room.id
    assert message_out.sender.id == create_test_user.id

@pytest.mark.asyncio
async def test_send_message_to_room_not_member(client: AsyncClient, auth_headers: dict, create_private_room: ChatRoom):
    # User is owner, but let's assume a public room where they are NOT a member.
    # We will use the private room here and ensure `auth_headers` (owner) is still a member
    # but the test is about sending message to a room where the *sender* is not a member.
    message_data = MessageCreate(content="Attempting to send message without being a member.")
    
    # We remove the test user from the room, making them not a member
    async with AsyncSessionLocal() as db:
        await crud_chat_room.remove_member(db, room=create_private_room, user=await crud_user.get(db, create_private_room.owner_id))
        await db.commit() # Commit the change

    response = await client.post(f"/api/v1/messages/{create_private_room.id}", headers=auth_headers, json=message_data.model_dump())
    assert response.status_code == 403
    assert response.json()["detail"] == "Not a member of this room, cannot send messages"


@pytest.mark.asyncio
async def test_get_message_history(client: AsyncClient, auth_headers: dict, create_chat_room: ChatRoom, create_test_user: User):
    # Send a few messages
    message1 = await client.post(f"/api/v1/messages/{create_chat_room.id}", headers=auth_headers, json={"content": "First message"})
    message2 = await client.post(f"/api/v1/messages/{create_chat_room.id}", headers=auth_headers, json={"content": "Second message"})
    assert message1.status_code == 201
    assert message2.status_code == 201

    response = await client.get(f"/api/v1/messages/{create_chat_room.id}", headers=auth_headers)
    assert response.status_code == 200
    messages = [MessagePublic(**msg) for msg in response.json()]
    assert len(messages) == 2
    assert messages[0].content == "First message"
    assert messages[1].content == "Second message"
    assert messages[0].sender.id == create_test_user.id

@pytest.mark.asyncio
async def test_get_message_history_private_unauthorized(client: AsyncClient, create_private_room: ChatRoom, create_another_user: User):
    # Send a message by the owner
    owner_user = (await AsyncSessionLocal() as db).__aexit__(None, None, None) # Get a dummy user (this part is flaky)
    owner_user = await crud_user.get(db_session, create_private_room.owner_id)
    # Log in as owner to send message
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": owner_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    owner_token = response.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    
    await client.post(f"/api/v1/messages/{create_private_room.id}", headers=owner_headers, json={"content": "Private message"})
    
    # Login as create_another_user (not a member) to get their token
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]
    another_user_headers = {"Authorization": f"Bearer {another_user_token}"}

    response = await client.get(f"/api/v1/messages/{create_private_room.id}", headers=another_user_headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to view messages in this private chat room"

@pytest.mark.asyncio
async def test_websocket_connection_and_message_broadcast(client: AsyncClient, auth_token: str, create_chat_room: ChatRoom, create_test_user: User, create_another_user: User, db_session: AsyncSession):
    # Ensure both users are members of the room
    await crud_chat_room.add_member(db_session, room=create_chat_room, user=create_another_user)
    await db_session.commit()
    
    # Get token for the second user
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_another_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    another_user_token = response.json()["access_token"]

    messages_received_user1 = []
    messages_received_user2 = []

    # Use a real WebSocket connection (requires Uvicorn to be running or an in-memory mock for full integration)
    # For integration tests, we assume `uvicorn` is serving the app.
    # In this pytest context, `httpx.AsyncClient` doesn't provide real WS.
    # We need to simulate by directly connecting to the exposed port or using a specific test server fixture.
    # For now, we will simulate the connection using `websockets.client.connect`
    # and adjust the `base_url` as if the client were connecting to `localhost:8000`.

    # Clear manager before test
    websocket_manager.active_connections.clear()
    websocket_manager.user_connections.clear()

    # User 1 connects
    ws_url1 = f"ws://localhost:8000/api/v1/ws?room_id={create_chat_room.id}&token={auth_token}"
    # User 2 connects
    ws_url2 = f"ws://localhost:8000/api/v1/ws?room_id={create_chat_room.id}&token={another_user_token}"

    # Use asyncio.wait_for to prevent tests from hanging
    async with ws_connect(ws_url1) as websocket1, ws_connect(ws_url2) as websocket2:
        # Wait for system messages indicating join
        # User1's join message is broadcast and received by user1 and user2
        # User2's join message is broadcast and received by user1 and user2
        system_join_msg1 = await asyncio.wait_for(websocket1.recv(), timeout=2)
        system_join_msg2 = await asyncio.wait_for(websocket2.recv(), timeout=2)
        
        # User 1 receives User 2's join message
        system_join_msg1_from_u2 = await asyncio.wait_for(websocket1.recv(), timeout=2)
        # User 2 receives User 1's join message
        system_join_msg2_from_u1 = await asyncio.wait_for(websocket2.recv(), timeout=2)
        
        # At this point, both users are connected and received each other's join messages.
        assert "has joined." in system_join_msg1 # Could be either user's join
        assert "has joined." in system_join_msg2
        assert "has joined." in system_join_msg1_from_u2
        assert "has joined." in system_join_msg2_from_u1

        # User 1 sends a message via REST API
        message_content = "Hello from User 1!"
        post_response = await client.post(
            f"/api/v1/messages/{create_chat_room.id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"content": message_content}
        )
        assert post_response.status_code == 201
        sent_message_public = MessagePublic(**post_response.json())

        # Both WebSockets should receive the message
        received_message_str_1 = await asyncio.wait_for(websocket1.recv(), timeout=2)
        received_message_str_2 = await asyncio.wait_for(websocket2.recv(), timeout=2)

        received_message_1 = MessagePublic(**json.loads(received_message_str_1))
        received_message_2 = MessagePublic(**json.loads(received_message_str_2))

        assert received_message_1.content == message_content
        assert received_message_1.sender.id == create_test_user.id
        assert received_message_1.chat_room_id == create_chat_room.id

        assert received_message_2.content == message_content
        assert received_message_2.sender.id == create_test_user.id
        assert received_message_2.chat_room_id == create_chat_room.id

    # Verify that connections are properly cleaned up after disconnect
    await asyncio.sleep(0.1) # Give a moment for disconnect to process
    assert create_chat_room.id not in websocket_manager.active_connections
    assert create_test_user.id not in websocket_manager.user_connections
    assert create_another_user.id not in websocket_manager.user_connections

```