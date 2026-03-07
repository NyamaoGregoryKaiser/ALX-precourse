```javascript
document.addEventListener('DOMContentLoaded', () => {
    const baseUrl = document.getElementById('baseUrl').textContent;
    const apiCallCode = document.getElementById('api-call-code');

    const exampleCode = `
async function fetchTasks() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        console.error("No JWT token found. Please login first.");
        alert("No JWT token found. Please login first.");
        return;
    }

    try {
        const response = await fetch('${baseUrl}/tasks', {
            method: 'GET',
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (response.ok) {
            console.log("Tasks fetched successfully:", data);
            alert("Tasks fetched successfully! Check console for data.");
        } else {
            console.error("Failed to fetch tasks:", data);
            alert("Failed to fetch tasks! Check console for error.");
        }
    } catch (error) {
        console.error("Network or parsing error:", error);
        alert("Network or parsing error! Check console.");
    }
}
// You can call fetchTasks() from your console after setting the token.
    `;
    apiCallCode.textContent = exampleCode;

    // Make fetchTasks globally available for the button
    window.makeApiCall = async () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            console.error("No JWT token found. Please login first.");
            alert("No JWT token found. Please login first.");
            return;
        }

        try {
            const response = await fetch(`${baseUrl}/tasks`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (response.ok) {
                console.log("Tasks fetched successfully:", data);
                alert("Tasks fetched successfully! Check console for data.");
            } else {
                console.error("Failed to fetch tasks:", data);
                alert("Failed to fetch tasks! Check console for error.");
            }
        } catch (error) {
            console.error("Network or parsing error:", error);
            alert("Network or parsing error! Check console.");
        }
    };
});
```