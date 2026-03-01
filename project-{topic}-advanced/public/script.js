```javascript
// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api/v1'; // Adjust if your API is on a different base path

    // Elements
    const globalMessage = document.getElementById('global-message');
    const authStatus = document.getElementById('auth-status');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const createMerchantForm = document.getElementById('create-merchant-form');
    const merchantCreationStatus = document.getElementById('merchant-creation-status');
    const apiKeyDisplay = document.getElementById('api-key-display');
    const newMerchantApiKeySpan = document.getElementById('new-merchant-api-key');
    const loadMerchantsBtn = document.getElementById('load-merchants-btn');
    const merchantsTableBody = document.querySelector('#merchants-table tbody');
    const merchantApiKeyInput = document.getElementById('merchant-api-key');
    const fetchMerchantTransactionsBtn = document.getElementById('fetch-merchant-transactions-btn');
    const transactionStatusDiv = document.getElementById('transaction-status');
    const processTransactionForm = document.getElementById('process-transaction-form');
    const processTransactionResultDiv = document.getElementById('process-transaction-result');
    const transactionsTableBody = document.querySelector('#transactions-table tbody');

    let accessToken = localStorage.getItem('accessToken');
    let adminUser = localStorage.getItem('adminUser') ? JSON.parse(localStorage.getItem('adminUser')) : null;

    // Helper to display messages
    const showMessage = (element, message, type = 'info') => {
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; }, 5000);
    };

    // Update UI based on auth status
    const updateAuthUI = () => {
        if (accessToken && adminUser) {
            authStatus.textContent = `Logged in as: ${adminUser.email} (Role: ${adminUser.role})`;
            logoutBtn.style.display = 'block';
            loginForm.style.display = 'none';
        } else {
            authStatus.textContent = 'Not logged in.';
            logoutBtn.style.display = 'none';
            loginForm.style.display = 'flex';
        }
    };

    // API Call Helper
    const callApi = async (method, path, body = null, useAuth = true, apiKey = null) => {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (useAuth && accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        if (apiKey) {
            headers['X-Api-Key'] = apiKey;
        }

        const options = {
            method,
            headers,
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${path}`, options);
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || 'Something went wrong';
            throw new Error(errorMessage);
        }
        return data;
    };

    // --- Authentication ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const data = await callApi('POST', '/auth/login', { email, password }, false);
            accessToken = data.tokens.access.token;
            adminUser = data.user;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('adminUser', JSON.stringify(adminUser));
            showMessage(globalMessage, 'Login successful!', 'success');
            updateAuthUI();
        } catch (error) {
            showMessage(globalMessage, `Login failed: ${error.message}`, 'error');
        }
    });

    logoutBtn.addEventListener('click', () => {
        accessToken = null;
        adminUser = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('adminUser');
        showMessage(globalMessage, 'Logged out successfully.', 'info');
        updateAuthUI();
    });

    // --- Merchant Management ---
    createMerchantForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!accessToken) {
            showMessage(merchantCreationStatus, 'Please login as admin first.', 'error');
            return;
        }

        const name = document.getElementById('merchant-name').value;
        const email = document.getElementById('merchant-email').value;
        const businessCategory = document.getElementById('merchant-category').value;

        try {
            const newMerchant = await callApi('POST', '/merchants', { name, email, businessCategory });
            showMessage(merchantCreationStatus, `Merchant "${newMerchant.name}" created successfully!`, 'success');
            // Display the API key (DANGER: In a real app, only show once and secure storage)
            newMerchantApiKeySpan.textContent = newMerchant.apiKey;
            apiKeyDisplay.style.display = 'block';
            createMerchantForm.reset();
            loadMerchants(); // Refresh the list
        } catch (error) {
            showMessage(merchantCreationStatus, `Merchant creation failed: ${error.message}`, 'error');
            apiKeyDisplay.style.display = 'none';
        }
    });

    loadMerchantsBtn.addEventListener('click', loadMerchants);

    async function loadMerchants() {
        if (!accessToken) {
            showMessage(globalMessage, 'Please login as admin to view merchants.', 'error');
            return;
        }
        try {
            const { results: merchants } = await callApi('GET', '/merchants');
            merchantsTableBody.innerHTML = ''; // Clear existing
            if (merchants.length === 0) {
                merchantsTableBody.innerHTML = '<tr><td colspan="6">No merchants found.</td></tr>';
                return;
            }
            merchants.forEach(merchant => {
                const row = merchantsTableBody.insertRow();
                row.insertCell().textContent = merchant.id.substring(0, 8) + '...';
                row.insertCell().textContent = merchant.name;
                row.insertCell().textContent = merchant.email;
                row.insertCell().textContent = merchant.businessCategory;
                // DANGER: Only for demo, never expose API keys like this in production
                row.insertCell().textContent = merchant.apiKey.substring(0, 10) + '...';
                row.insertCell().textContent = merchant.isActive ? 'Yes' : 'No';
            });
            showMessage(globalMessage, `Loaded ${merchants.length} merchants.`, 'info');
        } catch (error) {
            showMessage(globalMessage, `Failed to load merchants: ${error.message}`, 'error');
        }
    }

    // --- Transaction Processing ---
    processTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const apiKey = merchantApiKeyInput.value;
        if (!apiKey) {
            showMessage(processTransactionResultDiv, 'Please enter a Merchant API Key.', 'error');
            return;
        }

        const amount = parseInt(document.getElementById('transaction-amount').value, 10);
        const currency = document.getElementById('transaction-currency').value;
        const paymentMethodType = document.getElementById('payment-method-type').value;
        const paymentMethodToken = document.getElementById('payment-method-token').value;
        const customerId = document.getElementById('customer-id').value || undefined;
        const description = document.getElementById('transaction-description').value || undefined;

        const idempotencyKey = crypto.randomUUID(); // ALX Principle: Use UUID for idempotency

        const transactionData = {
            amount,
            currency,
            paymentMethodType,
            paymentMethodDetails: { token: paymentMethodToken },
            customerId,
            description,
        };

        try {
            const newTransaction = await callApi('POST', '/transactions/process', transactionData, false, apiKey, {
                'X-Idempotency-Key': idempotencyKey
            });
            showMessage(processTransactionResultDiv, `Transaction ${newTransaction.id} initiated with status: ${newTransaction.status}`, 'success');
            processTransactionForm.reset();
            loadMerchantTransactions(); // Refresh transaction list
        } catch (error) {
            showMessage(processTransactionResultDiv, `Transaction processing failed: ${error.message}`, 'error');
        }
    });

    fetchMerchantTransactionsBtn.addEventListener('click', loadMerchantTransactions);

    async function loadMerchantTransactions() {
        const apiKey = merchantApiKeyInput.value;
        if (!apiKey) {
            showMessage(transactionStatusDiv, 'Please enter a Merchant API Key to fetch transactions.', 'error');
            return;
        }
        try {
            const { results: transactions } = await callApi('GET', '/transactions', null, false, apiKey);
            transactionsTableBody.innerHTML = '';
            if (transactions.length === 0) {
                transactionsTableBody.innerHTML = '<tr><td colspan="7">No transactions found for this merchant.</td></tr>';
                return;
            }
            transactions.forEach(tx => {
                const row = transactionsTableBody.insertRow();
                row.insertCell().textContent = tx.id.substring(0, 8) + '...';
                row.insertCell().textContent = tx.merchantId.substring(0, 8) + '...';
                row.insertCell().textContent = (tx.amount / 100).toFixed(2); // Convert cents to dollars
                row.insertCell().textContent = tx.currency;
                row.insertCell().textContent = tx.status;
                row.insertCell().textContent = tx.gatewayReferenceId ? tx.gatewayReferenceId.substring(0, 8) + '...' : 'N/A';
                row.insertCell().textContent = new Date(tx.createdAt).toLocaleString();
            });
            showMessage(transactionStatusDiv, `Loaded ${transactions.length} transactions.`, 'info');
        } catch (error) {
            showMessage(transactionStatusDiv, `Failed to load transactions: ${error.message}`, 'error');
        }
    }

    // Initial UI setup
    updateAuthUI();
});
```