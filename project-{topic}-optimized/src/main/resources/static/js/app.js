```javascript
const API_BASE_URL = '/api/v1';
const WS_BASE_URL = 'http://localhost:8080/ws/chat'; // Use full URL for SockJS
let stompClient = null;
let currentRoomId = null;
let currentUser = null; // Store user details after login

// --- Elements ---
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

const chatPage = document.getElementById('chat-page');
const welcomeUser = document.getElementById('welcomeUser');
const logoutButton = document.getElementById('logoutButton');
const roomsList = document.getElementById('rooms');
const createRoomForm = document.getElementById('createRoomForm');
const newRoomNameInput = document.getElementById('newRoomName');
const newRoomTypeSelect = document.getElementById('newRoomType');
const currentRoomName = document.getElementById('currentRoomName');
const messageArea = document.getElementById('messageArea');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = messageForm.querySelector('button[type="submit"]');

// --- Utility Functions ---
function showMessage(element, msg, isSuccess = false) {
    element.textContent = msg;
    element.className = 'message ' + (isSuccess ? 'success' : 'error');
    setTimeout(() => { element.textContent = ''; element.className = 'message'; }, 5000);
}

function getJwtToken() {
    return localStorage.getItem('jwtToken');
}

function setJwtToken(token) {
    localStorage.setItem('jwtToken', token);
}

function removeJwtToken() {
    localStorage.removeItem('jwtToken');
}

function goToChatPage() {
    window.location.href = 'chat.html';
}

function goToLoginPage() {
    window.location.href = 'index.html';
}

// --- Auth Handling ---
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    // On login/register page
    if (getJwtToken()) {
        // If token exists, try to go to chat page
        fetchCurrentUser().then(user => {
            if (user) goToChatPage();
        }).catch(() => {
            removeJwtToken(); // Token might be invalid
        });
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const usernameOrEmail = loginUsernameEmail.value;
        const password = loginPassword.value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameOrEmail, password })
            });
            const data = await response.json();

            if (response.ok) {
                setJwtToken(data.token);
                showMessage(loginMessage, 'Login successful!', true);
                setTimeout(goToChatPage, 1000);
            } else {
                showMessage(loginMessage, data.message || 'Login failed.');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage(loginMessage, 'Network error or server unavailable.');
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = registerUsername.value;
        const email = registerEmail.value;
        const password = registerPassword.value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();

            if (response.ok) {
                showMessage(registerMessage, data || 'Registration successful!', true);
                registerForm.reset();
            } else {
                showMessage(registerMessage, data.message || 'Registration failed.');
            }
        } catch (error) {
            console.error('Register error:', error);
            showMessage(registerMessage, 'Network error or server unavailable.');
        }
    });
} else if (window.location.pathname.endsWith('chat.html')) {
    // On chat page
    if (!getJwtToken()) {
        goToLoginPage(); // Redirect if no token
    } else {
        initChatPage();
    }
}

async function fetchCurrentUser() {
    const token = getJwtToken();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, { // Assuming /users/me endpoint returns current user details
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            return user;
        } else if (response.status === 401 || response.status === 403) {
            // Token expired or invalid
            removeJwtToken();
            goToLoginPage();
        }
    } catch (error) {
        console.error('Error fetching current user:', error);
        removeJwtToken();
        goToLoginPage();
    }
    return null;
}

logoutButton.addEventListener('click', () => {
    disconnectWebSocket();
    removeJwtToken();
    goToLoginPage();
});

// --- Chat Page Initialization ---
async function initChatPage() {
    currentUser = await fetchCurrentUser(); // Ensure currentUser is set
    if (!currentUser) return; // Should have redirected by now if not logged in

    welcomeUser.textContent = `Welcome, ${currentUser.username}!`;
    chatPage.classList.remove('hidden');

    await fetchAndDisplayRooms();
    connectWebSocket();

    createRoomForm.addEventListener('submit', handleCreateRoom);
    messageForm.addEventListener('submit', handleSendMessage);
}

// --- Room Management ---
async function fetchAndDisplayRooms() {
    const token = getJwtToken();
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/user/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const rooms = await response.json();
            roomsList.innerHTML = '';
            rooms.forEach(room => {
                const li = document.createElement('li');
                li.textContent = room.name;
                li.dataset.roomId = room.id;
                li.addEventListener('click', () => selectRoom(room.id, room.name));
                roomsList.appendChild(li);
            });
        } else {
            console.error('Failed to fetch rooms:', await response.text());
        }
    } catch (error) {
        console.error('Error fetching rooms:', error);
    }
}

async function handleCreateRoom(event) {
    event.preventDefault();
    const roomName = newRoomNameInput.value;
    const roomType = newRoomTypeSelect.value;
    const token = getJwtToken();

    try {
        const response = await fetch(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: roomName, type: roomType })
        });
        if (response.ok) {
            newRoomNameInput.value = '';
            await fetchAndDisplayRooms(); // Refresh room list
            const newRoom = await response.json();
            selectRoom(newRoom.id, newRoom.name); // Automatically join/select new room
        } else {
            alert('Failed to create room: ' + (await response.json()).message);
        }
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Error creating room.');
    }
}

async function selectRoom(roomId, roomName) {
    if (currentRoomId && stompClient && stompClient.connected) {
        // Unsubscribe from previous room if any
        stompClient.unsubscribe(`/topic/rooms/${currentRoomId}`);
        console.log(`Unsubscribed from /topic/rooms/${currentRoomId}`);
    }

    currentRoomId = roomId;
    currentRoomName.textContent = `Room: ${roomName}`;
    messageArea.innerHTML = ''; // Clear previous messages
    messageInput.disabled = false;
    sendMessageButton.disabled = false;

    // Highlight selected room
    document.querySelectorAll('.room-list li').forEach(li => {
        li.classList.remove('active');
        if (li.dataset.roomId == roomId) {
            li.classList.add('active');
        }
    });

    await fetchAndDisplayMessages(roomId);

    // Subscribe to new room
    if (stompClient && stompClient.connected) {
        stompClient.subscribe(`/topic/rooms/${currentRoomId}`, onMessageReceived, { 'Authorization': `Bearer ${getJwtToken()}` });
        console.log(`Subscribed to /topic/rooms/${currentRoomId}`);
    } else {
        console.warn('STOMP client not connected, cannot subscribe to room.');
    }
}

async function fetchAndDisplayMessages(roomId) {
    const token = getJwtToken();
    try {
        const response = await fetch(`${API_BASE_URL}/messages/room/${roomId}?page=0&size=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const messages = await response.json();
            messageArea.innerHTML = ''; // Clear existing messages before adding history
            messages.forEach(msg => addMessageToArea(msg));
            messageArea.scrollTop = messageArea.scrollHeight; // Scroll to bottom
        } else {
            console.error('Failed to fetch messages:', await response.text());
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}


// --- WebSocket Handling ---
function connectWebSocket() {
    const socket = new SockJS(WS_BASE_URL);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Disable STOMP debug logs for cleaner console

    stompClient.connect(
        { 'X-Auth-Token': getJwtToken() }, // Custom header for JWT token
        onConnected,
        onError
    );
}

function disconnectWebSocket() {
    if (stompClient) {
        stompClient.disconnect(() => {
            console.log("Disconnected from WebSocket");
        });
    }
}

function onConnected() {
    console.log('Connected to WebSocket!');
    stompClient.send("/app/chat.addUser",
        { 'X-Auth-Token': getJwtToken() },
        JSON.stringify({ sender: { username: currentUser.username } }) // This will be ignored by backend, but good to send something
    );

    // If a room was already selected, re-subscribe
    if (currentRoomId) {
        stompClient.subscribe(`/topic/rooms/${currentRoomId}`, onMessageReceived, { 'Authorization': `Bearer ${getJwtToken()}` });
        console.log(`Re-subscribed to /topic/rooms/${currentRoomId}`);
    }
}

function onError(error) {
    console.error('Could not connect to WebSocket server:', error);
    // Attempt to reconnect after a delay, or show error message
    setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
}

function handleSendMessage(event) {
    event.preventDefault();
    const messageContent = messageInput.value.trim();

    if (messageContent && stompClient && currentRoomId) {
        const chatMessage = {
            roomId: currentRoomId,
            content: messageContent
        };
        stompClient.send("/app/chat.sendMessage", { 'X-Auth-Token': getJwtToken() }, JSON.stringify(chatMessage));
        messageInput.value = '';
    } else if (!currentRoomId) {
        alert('Please select a room to send messages.');
    }
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    console.log('Received message:', message);

    if (message.roomId == currentRoomId) {
        addMessageToArea(message);
    }
}

function addMessageToArea(message) {
    const messageElement = document.createElement('li');

    const timestamp = new Date(message.sentAt).toLocaleString();

    if (message.sender.id === currentUser.id) {
        messageElement.classList.add('self');
        messageElement.innerHTML = `<strong>You</strong>: ${message.content} <span class="timestamp">${timestamp}</span>`;
    } else {
        messageElement.innerHTML = `<strong>${message.sender.username}</strong>: ${message.content} <span class="timestamp">${timestamp}</span>`;
    }

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight; // Scroll to bottom
}

// Initial check for chat page
if (document.getElementById('chat-page')) {
    initChatPage();
} else if (document.getElementById('loginForm')) {
    // Only run auth init if on login/register page
    // (Auth init handled earlier)
}
```