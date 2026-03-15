document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api/v1'; // Adjust if your backend runs on a different port

    const authSection = document.getElementById('auth-section');
    const dashboard = document.getElementById('dashboard');
    const authMessage = document.getElementById('auth-message');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const createCustomerForm = document.getElementById('create-customer-form');
    const customerListDiv = document.getElementById('customer-list');
    const createTransactionForm = document.getElementById('create-transaction-form');
    const transactionListDiv = document.getElementById('transaction-list');

    let token = localStorage.getItem('jwtToken');
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));

    const updateUI = () => {
        if (token && currentUser) {
            authSection.style.display = 'none';
            dashboard.style.display = 'block';
            authMessage.textContent = '';
            fetchCustomers();
            fetchTransactions();
        } else {
            authSection.style.display = 'block';
            dashboard.style.display = 'none';
        }
    };

    const callApi = async (url, method = 'GET', data = null) => {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers,
        };
        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${url}`, options);
        const result = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token expired or unauthorized, log out
                logout();
                throw new Error(result.message || 'Unauthorized');
            }
            throw new Error(result.message || 'API error');
        }
        return result;
    };

    // --- Authentication ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const result = await callApi('/auth/login', 'POST', { email, password });
            token = result.token;
            currentUser = result.data.user;
            localStorage.setItem('jwtToken', token);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUI();
        } catch (error) {
            authMessage.textContent = `Login failed: ${error.message}`;
            console.error('Login error:', error);
        }
    });

    logoutButton.addEventListener('click', () => {
        logout();
    });

    const logout = () => {
        token = null;
        currentUser = null;
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentUser');
        updateUI();
        authMessage.textContent = 'Logged out successfully.';
    };

    // --- Customer Management ---
    const fetchCustomers = async () => {
        try {
            const result = await callApi('/customers');
            customerListDiv.innerHTML = '<h4>Customers:</h4>';
            if (result.data.customers && result.data.customers.length > 0) {
                result.data.customers.forEach(customer => {
                    const div = document.createElement('div');
                    div.className = 'list-item';
                    div.innerHTML = `
                        <strong>ID:</strong> ${customer.id}<br>
                        <strong>Name:</strong> ${customer.name}<br>
                        <strong>Email:</strong> ${customer.email}<br>
                        <strong>Role:</strong> ${customer.role}<br>
                        <small>Created: ${new Date(customer.createdAt).toLocaleString()}</small>
                    `;
                    customerListDiv.appendChild(div);
                });
            } else {
                customerListDiv.innerHTML += '<p>No customers found.</p>';
            }
        } catch (error) {
            customerListDiv.innerHTML = `<p style="color:red;">Failed to load customers: ${error.message}</p>`;
            console.error('Fetch customers error:', error);
        }
    };

    createCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('customer-name').value;
        const email = document.getElementById('customer-email').value;
        const password = document.getElementById('customer-password').value;
        const role = document.getElementById('customer-role').value;

        try {
            await callApi('/customers', 'POST', { name, email, password, role });
            alert('Customer created successfully!');
            createCustomerForm.reset();
            fetchCustomers();
        } catch (error) {
            alert(`Failed to create customer: ${error.message}`);
            console.error('Create customer error:', error);
        }
    });

    // --- Transaction Management ---
    const fetchTransactions = async () => {
        try {
            // For customers, only fetch their own transactions
            const url = currentUser.role === 'customer' ? `/transactions?customerId=${currentUser.id}` : '/transactions';
            const result = await callApi(url);
            transactionListDiv.innerHTML = '<h4>Transactions:</h4>';
            if (result.data.transactions && result.data.transactions.length > 0) {
                result.data.transactions.forEach(txn => {
                    const div = document.createElement('div');
                    const statusClass = `transaction-status-${txn.status.toLowerCase()}`;
                    div.className = `list-item`;
                    div.innerHTML = `
                        <strong>ID:</strong> ${txn.id}<br>
                        <strong>Customer:</strong> ${txn.Customer ? txn.Customer.name : 'N/A'} (ID: ${txn.customerId})<br>
                        <strong>Amount:</strong> ${txn.currency} ${txn.amount.toFixed(2)}<br>
                        <strong>Type:</strong> ${txn.type}<br>
                        <strong>Status:</strong> <span class="${statusClass}">${txn.status.toUpperCase()}</span><br>
                        <strong>Description:</strong> ${txn.description || 'N/A'}<br>
                        <small>Initiated: ${new Date(txn.createdAt).toLocaleString()}</small><br>
                        <small>Processed: ${txn.processedAt ? new Date(txn.processedAt).toLocaleString() : 'N/A'}</small>
                    `;
                    transactionListDiv.appendChild(div);
                });
            } else {
                transactionListDiv.innerHTML += '<p>No transactions found.</p>';
            }
        } catch (error) {
            transactionListDiv.innerHTML = `<p style="color:red;">Failed to load transactions: ${error.message}</p>`;
            console.error('Fetch transactions error:', error);
        }
    };

    createTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerId = document.getElementById('transaction-customer-id').value;
        const paymentMethodId = document.getElementById('transaction-payment-method-id').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const currency = document.getElementById('transaction-currency').value;
        const type = document.getElementById('transaction-type').value;
        const description = document.getElementById('transaction-description').value;

        try {
            await callApi('/transactions', 'POST', {
                customerId,
                paymentMethodId,
                amount,
                currency,
                type,
                description
            });
            alert('Transaction initiated successfully! Status will update shortly.');
            createTransactionForm.reset();
            fetchTransactions(); // Refresh list to show new transaction
        } catch (error) {
            alert(`Failed to create transaction: ${error.message}`);
            console.error('Create transaction error:', error);
        }
    });

    // Initial UI update
    updateUI();
});