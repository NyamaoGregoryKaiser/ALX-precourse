const API_BASE_URL = 'http://localhost:3000/api/v1';

// DOM Elements
const statusMessage = document.getElementById('status-message');
const errorMessage = document.getElementById('error-message');

const authSection = document.getElementById('auth-section');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const loggedInInfo = document.getElementById('logged-in-info');
const userIdSpan = document.getElementById('user-id');
const userEmailSpan = document.getElementById('user-email');
const userRoleSpan = document.getElementById('user-role');
const jwtTokenSpan = document.getElementById('jwt-token');
const logoutButton = document.getElementById('logout-button');

const appFeatures = document.getElementById('app-features');
const createAccountForm = document.getElementById('create-account-form');
const refreshAccountsButton = document.getElementById('refresh-accounts-button');
const accountList = document.getElementById('account-list');

const initiatePaymentForm = document.getElementById('initiate-payment-form');
const generateUuidButton = document.getElementById('generate-uuid-button');
const idempotencyKeyInput = document.getElementById('idempotency-key');
const refundPaymentForm = document.getElementById('refund-payment-form');
const lookupPaymentIdInput = document.getElementById('lookup-payment-id');
const lookupPaymentButton = document.getElementById('lookup-payment-button');
const paymentDetailsOutput = document.getElementById('payment-details-output');


const selectedAccountIdSpan = document.getElementById('selected-account-id');
const refreshTransactionsButton = document.getElementById('refresh-transactions-button');
const transactionList = document.getElementById('transaction-list');

let currentToken = localStorage.getItem('jwt_token');
let currentUserId = localStorage.getItem('user_id');
let currentUserEmail = localStorage.getItem('user_email');
let currentUserRole = localStorage.getItem('user_role');
let selectedAccountId = null; // To store the currently selected account for transaction display

// --- Utility Functions ---
function showMessage(msg, isError = false) {
    statusMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    if (isError) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    } else {
        statusMessage.textContent = msg;
        statusMessage.style.display = 'block';
    }
}

function clearMessages() {
    statusMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
    };
}

function updateUI() {
    clearMessages();
    if (currentToken) {
        authSection.style.display = 'block';
        registerForm.style.display = 'none';
        loginForm.style.display = 'none';
        loggedInInfo.style.display = 'block';
        appFeatures.style.display = 'block';

        userIdSpan.textContent = currentUserId;
        userEmailSpan.textContent = currentUserEmail;
        userRoleSpan.textContent = currentUserRole;
        jwtTokenSpan.textContent = currentToken;

        fetchAccounts();
    } else {
        authSection.style.display = 'block';
        registerForm.style.display = 'block';
        loginForm.style.display = 'block';
        loggedInInfo.style.display = 'none';
        appFeatures.style.display = 'none';

        accountList.innerHTML = '';
        transactionList.innerHTML = '';
        selectedAccountIdSpan.textContent = 'None';
        selectedAccountId = null;
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0,
              v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- API Calls ---

async function registerUser(e) {
    e.preventDefault();
    clearMessages();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role: 'user' }) // Default to user role
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(data.message);
            // Optionally auto-login after registration
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
        } else {
            showMessage(data.message || 'Registration failed', true);
        }
    } catch (error) {
        showMessage('Network error during registration: ' + error.message, true);
    }
}

async function loginUser(e) {
    e.preventDefault();
    clearMessages();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            currentToken = data.token;
            currentUserId = data.user.id;
            currentUserEmail = data.user.email;
            currentUserRole = data.user.role;

            localStorage.setItem('jwt_token', currentToken);
            localStorage.setItem('user_id', currentUserId);
            localStorage.setItem('user_email', currentUserEmail);
            localStorage.setItem('user_role', currentUserRole);

            showMessage(data.message);
            updateUI();
        } else {
            showMessage(data.message || 'Login failed', true);
        }
    } catch (error) {
        showMessage('Network error during login: ' + error.message, true);
    }
}

function logout() {
    currentToken = null;
    currentUserId = null;
    currentUserEmail = null;
    currentUserRole = null;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    showMessage('Logged out successfully.');
    updateUI();
}

async function createAccount(e) {
    e.preventDefault();
    clearMessages();
    const currency = document.getElementById('account-currency').value;
    const balance = parseFloat(document.getElementById('account-balance').value);

    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ currency, balance })
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(data.message);
            fetchAccounts(); // Refresh account list
        } else {
            showMessage(data.message || 'Account creation failed', true);
        }
    } catch (error) {
        showMessage('Network error during account creation: ' + error.message, true);
    }
}

async function fetchAccounts() {
    clearMessages();
    accountList.innerHTML = '<li>Loading accounts...</li>';
    try {
        const response = await fetch(`${API_BASE_URL}/accounts/my`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (response.ok) {
            accountList.innerHTML = '';
            if (data.accounts && data.accounts.length > 0) {
                data.accounts.forEach(account => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>ID:</strong> ${account.id}<br>
                        <strong>Currency:</strong> ${account.currency}<br>
                        <strong>Balance:</strong> ${account.balance.toFixed(2)}<br>
                        <button class="select-account-btn" data-account-id="${account.id}">View Transactions</button>
                    `;
                    accountList.appendChild(li);
                });
                // Set first account as selected by default if none is
                if (!selectedAccountId && data.accounts.length > 0) {
                    selectedAccountId = data.accounts[0].id;
                    selectedAccountIdSpan.textContent = selectedAccountId;
                    fetchTransactions(selectedAccountId);
                }
            } else {
                accountList.innerHTML = '<li>No accounts found. Create one above!</li>';
            }
        } else {
            showMessage(data.message || 'Failed to fetch accounts', true);
        }
    } catch (error) {
        showMessage('Network error during account fetch: ' + error.message, true);
    }
}

async function fetchTransactions(accountId) {
    clearMessages();
    transactionList.innerHTML = '<li>Loading transactions...</li>';
    try {
        const response = await fetch(`${API_BASE_URL}/transactions/account/${accountId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (response.ok) {
            transactionList.innerHTML = '';
            if (data.transactions && data.transactions.length > 0) {
                data.transactions.forEach(transaction => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>ID:</strong> ${transaction.id}<br>
                        <strong>Type:</strong> ${transaction.type}<br>
                        <strong>Amount:</strong> ${transaction.amount.toFixed(2)} ${transaction.currency}<br>
                        <strong>Status:</strong> ${transaction.status}<br>
                        <strong>Description:</strong> ${transaction.description || 'N/A'}<br>
                        <strong>Date:</strong> ${new Date(transaction.created_at).toLocaleString()}
                    `;
                    transactionList.appendChild(li);
                });
            } else {
                transactionList.innerHTML = '<li>No transactions found for this account.</li>';
            }
        } else {
            showMessage(data.message || 'Failed to fetch transactions', true);
        }
    } catch (error) {
        showMessage('Network error during transaction fetch: ' + error.message, true);
    }
}

async function initiatePayment(e) {
    e.preventDefault();
    clearMessages();
    const sourceAccountId = document.getElementById('payment-source-account').value;
    const destinationAccountId = document.getElementById('payment-destination-account').value;
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const currency = document.getElementById('payment-currency').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const description = document.getElementById('payment-description').value;
    const idempotencyKey = document.getElementById('idempotency-key').value;

    try {
        const response = await fetch(`${API_BASE_URL}/payments/initiate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                sourceAccountId,
                destinationAccountId,
                amount,
                currency,
                paymentMethod,
                description,
                idempotencyKey
            })
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(data.message + `. Payment ID: ${data.payment.paymentId}`);
            fetchAccounts(); // Refresh accounts to see balance changes
            // If the source account is selected, refresh its transactions
            if (selectedAccountId === sourceAccountId) {
                fetchTransactions(sourceAccountId);
            }
            // Clear idempotency key for next payment
            document.getElementById('idempotency-key').value = '';
        } else {
            showMessage(data.message || 'Payment initiation failed', true);
        }
    } catch (error) {
        showMessage('Network error during payment initiation: ' + error.message, true);
    }
}

async function refundPayment(e) {
    e.preventDefault();
    clearMessages();
    const paymentId = document.getElementById('refund-payment-id').value;
    const amountInput = document.getElementById('refund-amount').value;
    const amount = amountInput ? parseFloat(amountInput) : undefined;

    const body = amount ? { amount } : {};

    try {
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/refund`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(data.message + `. Refund Transaction ID: ${data.refundTransaction.id}`);
            fetchAccounts(); // Refresh accounts to see balance changes
            // Refresh transactions for relevant account if available
            if (data.refundTransaction && selectedAccountId === data.refundTransaction.account_id) {
                fetchTransactions(selectedAccountId);
            }
        } else {
            showMessage(data.message || 'Payment refund failed', true);
        }
    } catch (error) {
        showMessage('Network error during payment refund: ' + error.message, true);
    }
}

async function lookupPaymentDetails() {
    clearMessages();
    paymentDetailsOutput.innerHTML = '';
    const paymentId = lookupPaymentIdInput.value;
    if (!paymentId) {
        showMessage('Please enter a Payment ID for lookup.', true);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (response.ok) {
            const payment = data.payment;
            let outputHtml = `
                <h3>Payment ID: ${payment.paymentId}</h3>
                <p><strong>Status:</strong> ${payment.status}</p>
                <p><strong>Amount:</strong> ${payment.amount} ${payment.currency}</p>
                <p><strong>Source Account:</strong> ${payment.sourceAccountId}</p>
                <p><strong>Created At:</strong> ${new Date(payment.createdAt).toLocaleString()}</p>
                <p><strong>Description:</strong> ${payment.description || 'N/A'}</p>
                <p><strong>Idempotency Key:</strong> ${payment.idempotencyKey || 'N/A'}</p>
                <h4>Related Transactions:</h4>
                <ul id="payment-details-transactions"></ul>
            `;
            paymentDetailsOutput.innerHTML = outputHtml;

            const txList = document.getElementById('payment-details-transactions');
            if (payment.allRelatedTransactions && payment.allRelatedTransactions.length > 0) {
                payment.allRelatedTransactions.forEach(tx => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>Tx ID:</strong> ${tx.id} | 
                        <strong>Type:</strong> ${tx.type} | 
                        <strong>Amount:</strong> ${tx.amount.toFixed(2)} ${tx.currency} | 
                        <strong>Status:</strong> ${tx.status} | 
                        <strong>Account:</strong> ${tx.account_id}
                    `;
                    txList.appendChild(li);
                });
            } else {
                txList.innerHTML = '<li>No related transactions found.</li>';
            }
        } else {
            showMessage(data.message || 'Payment lookup failed', true);
        }
    } catch (error) {
        showMessage('Network error during payment lookup: ' + error.message, true);
    }
}


// --- Event Listeners ---
registerForm.addEventListener('submit', registerUser);
loginForm.addEventListener('submit', loginUser);
logoutButton.addEventListener('click', logout);
createAccountForm.addEventListener('submit', createAccount);
refreshAccountsButton.addEventListener('click', fetchAccounts);
accountList.addEventListener('click', (e) => {
    if (e.target.classList.contains('select-account-btn')) {
        selectedAccountId = e.target.dataset.accountId;
        selectedAccountIdSpan.textContent = selectedAccountId;
        fetchTransactions(selectedAccountId);
    }
});
refreshTransactionsButton.addEventListener('click', () => {
    if (selectedAccountId) {
        fetchTransactions(selectedAccountId);
    } else {
        showMessage('Please select an account first.', true);
    }
});

generateUuidButton.addEventListener('click', () => {
    idempotencyKeyInput.value = generateUUID();
});
initiatePaymentForm.addEventListener('submit', initiatePayment);
refundPaymentForm.addEventListener('submit', refundPayment);
lookupPaymentButton.addEventListener('click', lookupPaymentDetails);


// Initial UI update on page load
updateUI();