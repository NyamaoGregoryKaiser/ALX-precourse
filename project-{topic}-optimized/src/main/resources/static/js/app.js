const app = (function() {
    const API_BASE_URL = '/api';
    let authToken = localStorage.getItem('jwtToken') || null;
    let currentUser = localStorage.getItem('username') || null;
    let isAdmin = localStorage.getItem('isAdmin') === 'true';

    const elements = {
        authStatus: document.getElementById('authStatus'),
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        loggedInPanel: document.getElementById('loggedInPanel'),
        currentUsername: document.getElementById('currentUsername'),
        appSections: document.getElementById('appSections'),

        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        registerUsername: document.getElementById('registerUsername'),
        registerEmail: document.getElementById('registerEmail'),
        registerPassword: document.getElementById('registerPassword'),

        categoryMessage: document.getElementById('categoryMessage'),
        categoryId: document.getElementById('categoryId'),
        categoryName: document.getElementById('categoryName'),
        categoryDescription: document.getElementById('categoryDescription'),
        categoryTableBody: document.querySelector('#categoryTable tbody'),
        editCategoryTitle: document.getElementById('editCategoryTitle'),
        editCategoryId: document.getElementById('editCategoryId'),
        cancelEditCategoryBtn: document.getElementById('cancelEditCategoryBtn'),
        addCategoryForm: document.getElementById('addCategoryForm'),

        productMessage: document.getElementById('productMessage'),
        productId: document.getElementById('productId'),
        productName: document.getElementById('productName'),
        productDescription: document.getElementById('productDescription'),
        productPrice: document.getElementById('productPrice'),
        productStockQuantity: document.getElementById('productStockQuantity'),
        productCategorySelect: document.getElementById('productCategory'),
        productTableBody: document.querySelector('#productTable tbody'),
        editProductTitle: document.getElementById('editProductTitle'),
        editProductId: document.getElementById('editProductId'),
        cancelEditProductBtn: document.getElementById('cancelEditProductBtn'),
        addProductForm: document.getElementById('addProductForm'),
        productSearch: document.getElementById('productSearch')
    };

    /**
     * Helper function to display messages.
     * @param {HTMLElement} element - The element to display the message in.
     * @param {string} message - The message text.
     * @param {boolean} isError - True if it's an error message, false for success.
     */
    function displayMessage(element, message, isError) {
        element.textContent = message;
        element.className = `message ${isError ? 'error' : 'success'}`;
        element.classList.remove('hidden');
        setTimeout(() => element.classList.add('hidden'), 5000);
    }

    /**
     * Updates the UI based on authentication status.
     */
    function updateAuthUI() {
        if (authToken && currentUser) {
            elements.authStatus.textContent = `Logged in as: ${currentUser} (Admin: ${isAdmin})`;
            elements.loginForm.classList.add('hidden');
            elements.registerForm.classList.add('hidden');
            elements.loggedInPanel.classList.remove('hidden');
            elements.currentUsername.textContent = currentUser;
            elements.appSections.classList.remove('hidden');
            loadAllData();
        } else {
            elements.authStatus.textContent = 'Not logged in.';
            elements.loginForm.classList.remove('hidden');
            elements.registerForm.classList.remove('hidden');
            elements.loggedInPanel.classList.add('hidden');
            elements.appSections.classList.add('hidden');
        }

        // Enable/disable admin sections
        const adminButtons = document.querySelectorAll('.category-section button, .product-section button, [id$="Form"] input, [id$="Form"] select');
        adminButtons.forEach(btn => {
            // Only disable if not admin AND it's a create/update/delete action, not 'load' or 'search'
            if (!isAdmin && !(btn.textContent.includes('List') || btn.textContent.includes('Search') || btn.textContent.includes('Clear'))) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        });

        // Hide add/edit forms for non-admins
        if (!isAdmin) {
            elements.addCategoryForm.classList.add('hidden');
            elements.addProductForm.classList.add('hidden');
        } else {
            elements.addCategoryForm.classList.remove('hidden');
            elements.addProductForm.classList.remove('hidden');
        }
    }

    /**
     * Handles API requests with authentication.
     * @param {string} url - The API endpoint URL.
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE).
     * @param {object} [body=null] - Request body for POST/PUT.
     * @returns {Promise<Response>} - The fetch API response.
     */
    async function apiFetch(url, method, body = null) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const options = {
            method: method,
            headers: headers
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (response.status === 401 && authToken) {
            // Token might be expired or invalid, force logout
            console.error('Authentication token expired or invalid. Logging out.');
            logout();
        }
        return response;
    }

    /**
     * User login function.
     */
    async function login() {
        const username = elements.loginUsername.value;
        const password = elements.loginPassword.value;

        try {
            const response = await apiFetch(`${API_BASE_URL}/auth/login`, 'POST', { username, password });
            const data = await response.json();

            if (response.ok) {
                authToken = data.accessToken;
                localStorage.setItem('jwtToken', authToken);
                localStorage.setItem('username', username); // Store username
                currentUser = username;

                // Decode JWT to get roles (basic check for isAdmin)
                const payload = JSON.parse(atob(authToken.split('.')[1]));
                isAdmin = payload.roles && payload.roles.includes('ROLE_ADMIN');
                localStorage.setItem('isAdmin', isAdmin);

                displayMessage(elements.authStatus, 'Login successful!', false);
                elements.loginPassword.value = '';
                updateAuthUI();
            } else {
                displayMessage(elements.authStatus, `Login failed: ${data.message || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error during login:', error);
            displayMessage(elements.authStatus, 'An error occurred during login.', true);
        }
    }

    /**
     * User registration function.
     */
    async function register() {
        const username = elements.registerUsername.value;
        const email = elements.registerEmail.value;
        const password = elements.registerPassword.value;

        try {
            const response = await apiFetch(`${API_BASE_URL}/auth/register`, 'POST', { username, email, password });
            const text = await response.text(); // Register endpoint returns string

            if (response.ok) {
                displayMessage(elements.authStatus, text, false);
                elements.registerUsername.value = '';
                elements.registerEmail.value = '';
                elements.registerPassword.value = '';
            } else {
                displayMessage(elements.authStatus, `Registration failed: ${text || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error during registration:', error);
            displayMessage(elements.authStatus, 'An error occurred during registration.', true);
        }
    }

    /**
     * User logout function.
     */
    function logout() {
        authToken = null;
        currentUser = null;
        isAdmin = false;
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        localStorage.removeItem('isAdmin');
        displayMessage(elements.authStatus, 'Logged out successfully.', false);
        updateAuthUI();
        // Clear tables
        elements.categoryTableBody.innerHTML = '';
        elements.productTableBody.innerHTML = '';
    }

    // --- Category Management ---

    /**
     * Loads and displays all categories.
     */
    async function loadCategories() {
        if (!authToken) return;
        try {
            const response = await apiFetch(`${API_BASE_URL}/categories`, 'GET');
            const categories = await response.json();

            elements.categoryTableBody.innerHTML = '';
            elements.productCategorySelect.innerHTML = '<option value="">Select Category</option>'; // Clear product category dropdown

            if (response.ok) {
                categories.forEach(category => {
                    const row = elements.categoryTableBody.insertRow();
                    row.insertCell(0).textContent = category.id;
                    row.insertCell(1).textContent = category.name;
                    row.insertCell(2).textContent = category.description;

                    const actionsCell = row.insertCell(3);
                    actionsCell.classList.add('actions');

                    if (isAdmin) {
                        const editButton = document.createElement('button');
                        editButton.textContent = 'Edit';
                        editButton.onclick = () => editCategory(category);
                        actionsCell.appendChild(editButton);

                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Delete';
                        deleteButton.onclick = () => deleteCategory(category.id);
                        actionsCell.appendChild(deleteButton);
                    }

                    // Populate product category dropdown
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    elements.productCategorySelect.appendChild(option);
                });
            } else {
                displayMessage(elements.categoryMessage, `Failed to load categories: ${categories.message || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            displayMessage(elements.categoryMessage, 'An error occurred while loading categories.', true);
        }
    }

    /**
     * Saves (creates or updates) a category.
     */
    async function saveCategory() {
        const id = elements.categoryId.value;
        const name = elements.categoryName.value;
        const description = elements.categoryDescription.value;

        const categoryData = { name, description };

        try {
            let response;
            if (id) {
                response = await apiFetch(`${API_BASE_URL}/categories/${id}`, 'PUT', categoryData);
            } else {
                response = await apiFetch(`${API_BASE_URL}/categories`, 'POST', categoryData);
            }
            const data = await response.json();

            if (response.ok || response.status === 201) {
                displayMessage(elements.categoryMessage, `Category ${id ? 'updated' : 'created'} successfully!`, false);
                clearCategoryForm();
                await loadCategories();
                await loadProducts(); // Reload products as category names might change
            } else {
                displayMessage(elements.categoryMessage, `Failed to save category: ${data.message || data.error || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error saving category:', error);
            displayMessage(elements.categoryMessage, 'An error occurred while saving the category.', true);
        }
    }

    /**
     * Populates the category form for editing.
     * @param {object} category - The category object to edit.
     */
    function editCategory(category) {
        elements.categoryId.value = category.id;
        elements.categoryName.value = category.name;
        elements.categoryDescription.value = category.description;
        elements.editCategoryTitle.classList.remove('hidden');
        elements.editCategoryId.textContent = category.id;
        elements.cancelEditCategoryBtn.classList.remove('hidden');
    }

    /**
     * Deletes a category.
     * @param {number} id - The ID of the category to delete.
     */
    async function deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            const response = await apiFetch(`${API_BASE_URL}/categories/${id}`, 'DELETE');
            if (response.status === 204) {
                displayMessage(elements.categoryMessage, 'Category deleted successfully!', false);
                await loadCategories();
                await loadProducts(); // Reload products as associated category might be gone
            } else {
                const errorText = await response.text();
                displayMessage(elements.categoryMessage, `Failed to delete category: ${errorText || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            displayMessage(elements.categoryMessage, 'An error occurred while deleting the category.', true);
        }
    }

    /**
     * Clears the category form.
     */
    function clearCategoryForm() {
        elements.categoryId.value = '';
        elements.categoryName.value = '';
        elements.categoryDescription.value = '';
        elements.editCategoryTitle.classList.add('hidden');
        elements.editCategoryId.textContent = '';
        elements.cancelEditCategoryBtn.classList.add('hidden');
    }

    /**
     * Cancels category editing.
     */
    function cancelCategoryEdit() {
        clearCategoryForm();
    }

    // --- Product Management ---

    /**
     * Loads and displays all products, optionally filtered by a search keyword.
     */
    async function loadProducts() {
        if (!authToken) return;
        const searchKeyword = elements.productSearch.value;
        const url = searchKeyword ? `${API_BASE_URL}/products?search=${encodeURIComponent(searchKeyword)}` : `${API_BASE_URL}/products`;

        try {
            const response = await apiFetch(url, 'GET');
            const products = await response.json();

            elements.productTableBody.innerHTML = ''; // Clear existing rows

            if (response.ok) {
                products.forEach(product => {
                    const row = elements.productTableBody.insertRow();
                    row.insertCell(0).textContent = product.id;
                    row.insertCell(1).textContent = product.name;
                    row.insertCell(2).textContent = product.description;
                    row.insertCell(3).textContent = `$${product.price.toFixed(2)}`;
                    row.insertCell(4).textContent = product.stockQuantity;
                    row.insertCell(5).textContent = product.categoryName;

                    const actionsCell = row.insertCell(6);
                    actionsCell.classList.add('actions');

                    if (isAdmin) {
                        const editButton = document.createElement('button');
                        editButton.textContent = 'Edit';
                        editButton.onclick = () => editProduct(product);
                        actionsCell.appendChild(editButton);

                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Delete';
                        deleteButton.onclick = () => deleteProduct(product.id);
                        actionsCell.appendChild(deleteButton);
                    }
                });
            } else {
                displayMessage(elements.productMessage, `Failed to load products: ${products.message || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error loading products:', error);
            displayMessage(elements.productMessage, 'An error occurred while loading products.', true);
        }
    }

    /**
     * Saves (creates or updates) a product.
     */
    async function saveProduct() {
        const id = elements.productId.value;
        const name = elements.productName.value;
        const description = elements.productDescription.value;
        const price = parseFloat(elements.productPrice.value);
        const stockQuantity = parseInt(elements.productStockQuantity.value);
        const categoryId = parseInt(elements.productCategorySelect.value);

        if (!name || isNaN(price) || isNaN(stockQuantity) || isNaN(categoryId)) {
            displayMessage(elements.productMessage, 'Please fill all required product fields correctly.', true);
            return;
        }

        const productData = { name, description, price, stockQuantity, categoryId };

        try {
            let response;
            if (id) {
                response = await apiFetch(`${API_BASE_URL}/products/${id}`, 'PUT', productData);
            } else {
                response = await apiFetch(`${API_BASE_URL}/products`, 'POST', productData);
            }
            const data = await response.json();

            if (response.ok || response.status === 201) {
                displayMessage(elements.productMessage, `Product ${id ? 'updated' : 'created'} successfully!`, false);
                clearProductForm();
                await loadProducts();
            } else {
                displayMessage(elements.productMessage, `Failed to save product: ${data.message || data.error || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error saving product:', error);
            displayMessage(elements.productMessage, 'An error occurred while saving the product.', true);
        }
    }

    /**
     * Populates the product form for editing.
     * @param {object} product - The product object to edit.
     */
    function editProduct(product) {
        elements.productId.value = product.id;
        elements.productName.value = product.name;
        elements.productDescription.value = product.description;
        elements.productPrice.value = product.price;
        elements.productStockQuantity.value = product.stockQuantity;
        elements.productCategorySelect.value = product.categoryId;
        elements.editProductTitle.classList.remove('hidden');
        elements.editProductId.textContent = product.id;
        elements.cancelEditProductBtn.classList.remove('hidden');
    }

    /**
     * Deletes a product.
     * @param {number} id - The ID of the product to delete.
     */
    async function deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const response = await apiFetch(`${API_BASE_URL}/products/${id}`, 'DELETE');
            if (response.status === 204) {
                displayMessage(elements.productMessage, 'Product deleted successfully!', false);
                await loadProducts();
            } else {
                const errorText = await response.text();
                displayMessage(elements.productMessage, `Failed to delete product: ${errorText || response.statusText}`, true);
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            displayMessage(elements.productMessage, 'An error occurred while deleting the product.', true);
        }
    }

    /**
     * Clears the product form.
     */
    function clearProductForm() {
        elements.productId.value = '';
        elements.productName.value = '';
        elements.productDescription.value = '';
        elements.productPrice.value = '';
        elements.productStockQuantity.value = '';
        elements.productCategorySelect.value = ''; // Reset to "Select Category"
        elements.editProductTitle.classList.add('hidden');
        elements.editProductId.textContent = '';
        elements.cancelEditProductBtn.classList.add('hidden');
    }

    /**
     * Cancels product editing.
     */
    function cancelProductEdit() {
        clearProductForm();
    }

    /**
     * Loads all data (categories and products).
     */
    async function loadAllData() {
        await loadCategories();
        await loadProducts();
    }

    /**
     * Initializes the application.
     */
    function init() {
        updateAuthUI();
    }

    return {
        init,
        login,
        register,
        logout,
        loadCategories,
        saveCategory,
        editCategory,
        deleteCategory,
        cancelCategoryEdit,
        loadProducts,
        saveProduct,
        editProduct,
        deleteProduct,
        cancelProductEdit
    };
})();