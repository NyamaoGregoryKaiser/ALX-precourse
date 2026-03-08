```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.websocket_manager import WebSocketManager
from fastapi import WebSocket, WebSocketDisconnect

@pytest.fixture
def ws_manager():
    """Provides a fresh WebSocketManager for each test."""
    return WebSocketManager()

@pytest.mark.asyncio
async def test_connect(ws_manager):
    websocket = AsyncMock(spec=WebSocket)
    room_id = 1
    user_id = 101

    await ws_manager.connect(websocket, room_id, user_id)

    websocket.accept.assert_called_once()
    assert len(ws_manager.active_connections[room_id]) == 1
    assert ws_manager.active_connections[room_id][0] == (websocket, user_id)
    assert len(ws_manager.user_connections[user_id]) == 1
    assert ws_manager.user_connections[user_id][0] == websocket

@pytest.mark.asyncio
async def test_disconnect(ws_manager):
    websocket = AsyncMock(spec=WebSocket)
    room_id = 1
    user_id = 101

    await ws_manager.connect(websocket, room_id, user_id)
    ws_manager.disconnect(websocket, room_id, user_id)

    assert room_id not in ws_manager.active_connections
    assert user_id not in ws_manager.user_connections

@pytest.mark.asyncio
async def test_disconnect_multiple_connections_same_room(ws_manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    room_id = 1
    user_id = 101

    await ws_manager.connect(ws1, room_id, user_id)
    await ws_manager.connect(ws2, room_id, user_id) # Same user, same room

    assert len(ws_manager.active_connections[room_id]) == 2
    assert len(ws_manager.user_connections[user_id]) == 2

    ws_manager.disconnect(ws1, room_id, user_id)

    assert len(ws_manager.active_connections[room_id]) == 1
    assert ws_manager.active_connections[room_id][0] == (ws2, user_id)
    assert len(ws_manager.user_connections[user_id]) == 1
    assert ws_manager.user_connections[user_id][0] == ws2

    ws_manager.disconnect(ws2, room_id, user_id)
    assert room_id not in ws_manager.active_connections
    assert user_id not in ws_manager.user_connections


@pytest.mark.asyncio
async def test_disconnect_multiple_users_same_room(ws_manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    room_id = 1
    user_id1 = 101
    user_id2 = 102

    await ws_manager.connect(ws1, room_id, user_id1)
    await ws_manager.connect(ws2, room_id, user_id2)

    assert len(ws_manager.active_connections[room_id]) == 2
    assert user_id1 in ws_manager.user_connections and len(ws_manager.user_connections[user_id1]) == 1
    assert user_id2 in ws_manager.user_connections and len(ws_manager.user_connections[user_id2]) == 1

    ws_manager.disconnect(ws1, room_id, user_id1)

    assert len(ws_manager.active_connections[room_id]) == 1
    assert ws_manager.active_connections[room_id][0] == (ws2, user_id2)
    assert user_id1 not in ws_manager.user_connections
    assert user_id2 in ws_manager.user_connections

@pytest.mark.asyncio
async def test_broadcast_to_room(ws_manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    room_id = 1
    user_id1 = 101
    user_id2 = 102
    message = "Hello room!"

    await ws_manager.connect(ws1, room_id, user_id1)
    await ws_manager.connect(ws2, room_id, user_id2)

    await ws_manager.broadcast_to_room(room_id, message)

    ws1.send_text.assert_called_once_with(message)
    ws2.send_text.assert_called_once_with(message)

@pytest.mark.asyncio
async def test_broadcast_to_room_no_connections(ws_manager):
    room_id = 1
    message = "Hello room!"

    await ws_manager.broadcast_to_room(room_id, message)
    # No exceptions should be raised, and no send_text calls should occur
    assert True

@pytest.mark.asyncio
async def test_broadcast_to_room_with_disconnect(ws_manager, caplog):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    ws3 = AsyncMock(spec=WebSocket) # This one will fail
    room_id = 1
    user_id1 = 101
    user_id2 = 102
    user_id3 = 103
    message = "Test message"

    await ws_manager.connect(ws1, room_id, user_id1)
    await ws_manager.connect(ws2, room_id, user_id2)
    await ws_manager.connect(ws3, room_id, user_id3)

    ws3.send_text.side_effect = WebSocketDisconnect

    with caplog.at_level(pytest.logging.WARNING):
        await ws_manager.broadcast_to_room(room_id, message)

    ws1.send_text.assert_called_once_with(message)
    ws2.send_text.assert_called_once_with(message)
    ws3.send_text.assert_called_once_with(message) # Called, then exception raised

    # Check that a warning was logged for the disconnect
    assert "WebSocketDisconnect" in caplog.text
    assert f"user {user_id3}" in caplog.text

    # Note: the current broadcast_to_room does not remove disconnected client from self.active_connections
    # It relies on the disconnect method being called by the client/websocket_endpoint on WebSocketDisconnect.
    # If we wanted to clean up here, we would need to manually remove the failed websocket.
    assert len(ws_manager.active_connections[room_id]) == 3 # Still has 3 connections, as disconnect wasn't called.

@pytest.mark.asyncio
async def test_send_personal_message(ws_manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    user_id = 101
    room_id1 = 1
    room_id2 = 2
    message = "Personal message!"

    await ws_manager.connect(ws1, room_id1, user_id)
    await ws_manager.connect(ws2, room_id2, user_id) # Same user, different room

    await ws_manager.send_personal_message(user_id, message)

    ws1.send_text.assert_called_once_with(message)
    ws2.send_text.assert_called_once_with(message)

@pytest.mark.asyncio
async def test_get_connected_users_in_room(ws_manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    ws3 = AsyncMock(spec=WebSocket)
    room_id1 = 1
    room_id2 = 2
    user_id1 = 101
    user_id2 = 102

    await ws_manager.connect(ws1, room_id1, user_id1)
    await ws_manager.connect(ws2, room_id1, user_id2)
    await ws_manager.connect(ws3, room_id2, user_id1) # User 101 in another room

    connected_users = ws_manager.get_connected_users_in_room(room_id1)
    assert set(connected_users) == {user_id1, user_id2}

    connected_users_room2 = ws_manager.get_connected_users_in_room(room_id2)
    assert set(connected_users_room2) == {user_id1}

    # Test for non-existent room
    connected_users_nonexistent = ws_manager.get_connected_users_in_room(999)
    assert connected_users_nonexistent == []
```