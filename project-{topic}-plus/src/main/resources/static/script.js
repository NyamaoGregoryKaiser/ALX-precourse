```javascript
document.addEventListener('DOMContentLoaded', () => {
    const BASE_URL = '/api'; // Backend API base URL

    // --- DOM Elements ---
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const authMessage = document.getElementById('auth-message');
    const categoryMessage = document.getElementById('category-message');
    const productMessage = document.getElementById('product-message');

    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const currentUserSpan = document.getElementById('current-user');
    const currentRolesSpan = document.getElementById('current-roles');
    const jwtTokenTextarea = document.getElementById('jwt-token');

    const categoryForm = document.getElementById('category-form');
    const categoryFormTitle = document.getElementById('category-form-title');
    const categoryIdInput = document.getElementById('category-id');
    const categoryNameInput = document.getElementById('category-name');
    const saveCategoryButton = document.getElementById('save-category-button');
    const cancelCategoryButton = document.getElementById('cancel-category-button');
    const categoriesListDiv = document.getElementById('categories-list');

    const productForm = document.getElementById('product-form');
    const productFormTitle = document.getElementById('product-form-title');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescriptionInput = document.getElementById('product-description');
    const productPriceInput = document.getElementById('product-price');
    const productStockInput = document.getElementById('product-stock');
    const productCategorySelect = document.getElementById('product-category');
    const saveProductButton = document.getElementById('save-product-button');
    const cancelProductButton = document.getElementById('cancel-product-button');
    const productsListDiv = document.getElementById('products-list');

    const refreshProductsButton = document.getElementById('refresh-products-button');
    const refreshCategoriesButton = document.getElementById('refresh-categories-button');

    const searchNameInput = document.getElementById('search-name');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterMinPriceInput = document.getElementById('filter-min-price');
    const filterMaxPriceInput = document.getElementById('filter-max-price');
    const applyFiltersButton = document.getElementById('apply-filters-button');

    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');

    let jwtToken = localStorage.getItem('jwtToken');
    let currentRoles = [];
    let currentPage = 0; // 0-indexed for backend
    let totalPages = 1;

    // --- Helper Functions ---
    function showMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}`;
        element.classList.remove('hidden');
        setTimeout(() => element.classList.add('hidden'), 5000);
    }

    async function fetchData(url, options = {}) {
        if (jwtToken && !options.headers?.Authorization) {
            options.headers = { ...options.headers, 'Authorization': `Bearer ${jwtToken}` };
        }
        options.headers = { ...options.headers, 'Content-Type': 'application/json' };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error', status: response.status }));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error; // Re-throw to be caught by specific handlers
        }
    }

    function checkUserRole(role) {
        return currentRoles.includes(role);
    }

    function updateUIForRoles() {
        const isAdmin = checkUserRole('ROLE_ADMIN');
        const isManager = checkUserRole('ROLE_MANAGER');

        // Category Forms
        if (isAdmin) {
            categoryForm.classList.remove('hidden');
        } else {
            categoryForm.classList.add('hidden');
        }

        // Product Forms
        if (isAdmin || isManager) {
            productForm.classList.remove('hidden');
        } else {
            productForm.classList.add('hidden');
        }

        // Action buttons (edit/delete) are handled dynamically when rendering lists
    }

    // --- Auth Functions ---
    async function registerUser(event) {
        event.preventDefault();
        const username = registerForm.elements['reg-username'].value;
        const email = registerForm.elements['reg-email'].value;
        const password = registerForm.elements['reg-password'].value;

        try {
            await fetchData(`${BASE_URL}/auth/register`, {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });
            showMessage(authMessage, 'Registration successful! Please log in.', 'success');
            registerForm.reset();
        } catch (error) {
            showMessage(authMessage, `Registration failed: ${error.message}`, 'error');
        }
    }

    async function loginUser(event) {
        event.preventDefault();
        const username = loginForm.elements['login-username'].value;
        const password = loginForm.elements['login-password'].value;

        try {
            const data = await fetchData(`${BASE_URL}/auth/login`, {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            jwtToken = data.token;
            localStorage.setItem('jwtToken', jwtToken);
            updateAuthStatus();
            showMessage(authMessage, 'Login successful!', 'success');
            loginForm.reset();
            loadAllData(); // Load products and categories after login
        } catch (error) {
            showMessage(authMessage, `Login failed: ${error.message}`, 'error');
        }
    }

    function logoutUser() {
        jwtToken = null;
        localStorage.removeItem('jwtToken');
        currentRoles = [];
        updateAuthStatus();
        showMessage(authMessage, 'Logged out successfully.', 'success');
        clearAppData();
    }

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    function updateAuthStatus() {
        if (jwtToken) {
            const decodedToken = parseJwt(jwtToken);
            if (decodedToken && decodedToken.roles) {
                currentRoles = decodedToken.roles;
            } else {
                // If roles are not directly in JWT, you might need another endpoint
                // to fetch user details and roles after login.
                // For this example, we assume roles are in the token payload.
                currentRoles = ['ROLE_USER']; // Default if not in token or a simple user
            }

            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            logoutButton.classList.remove('hidden');
            currentUserSpan.textContent = decodedToken ? decodedToken.sub : 'Guest';
            currentRolesSpan.textContent = currentRoles.join(', ');
            jwtTokenTextarea.value = jwtToken;
        } else {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
            logoutButton.classList.add('hidden');
            currentUserSpan.textContent = '';
            currentRolesSpan.textContent = '';
            jwtTokenTextarea.value = '';
        }
        updateUIForRoles();
    }

    function clearAppData() {
        categoriesListDiv.innerHTML = '';
        productsListDiv.innerHTML = '';
        productCategorySelect.innerHTML = '<option value="">Select Category</option>';
        filterCategorySelect.innerHTML = '<option value="">All Categories</option>';
    }

    // --- Category Functions ---
    async function loadCategories() {
        try {
            const categories = await fetchData(`${BASE_URL}/categories`);
            displayCategories(categories);
            populateCategoryDropdowns(categories);
            showMessage(categoryMessage, 'Categories loaded successfully.', 'success');
        } catch (error) {
            showMessage(categoryMessage, `Failed to load categories: ${error.message}`, 'error');
        }
    }

    function displayCategories(categories) {
        categoriesListDiv.innerHTML = '';
        const isAdmin = checkUserRole('ROLE_ADMIN');

        if (categories.length === 0) {
            categoriesListDiv.innerHTML = '<p>No categories found.</p>';
            return;
        }

        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div>
                    <strong>ID:</strong> ${category.id}<br>
                    <strong>Name:</strong> ${category.name}
                </div>
                <div class="category-actions">
                    ${isAdmin ? `<button class="edit-category" data-id="${category.id}" data-name="${category.name}">Edit</button>` : ''}
                    ${isAdmin ? `<button class="delete-category" data-id="${category.id}">Delete</button>` : ''}
                </div>
            `;
            categoriesListDiv.appendChild(categoryItem);
        });

        if (isAdmin) {
            document.querySelectorAll('.edit-category').forEach(button => {
                button.addEventListener('click', (e) => editCategory(e.target.dataset.id, e.target.dataset.name));
            });
            document.querySelectorAll('.delete-category').forEach(button => {
                button.addEventListener('click', (e) => deleteCategory(e.target.dataset.id));
            });
        }
    }

    function populateCategoryDropdowns(categories) {
        productCategorySelect.innerHTML = '<option value="">Select Category</option>';
        filterCategorySelect.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            productCategorySelect.appendChild(option);

            const filterOption = option.cloneNode(true);
            filterCategorySelect.appendChild(filterOption);
        });
    }

    async function saveCategory(event) {
        event.preventDefault();
        const id = categoryIdInput.value;
        const name = categoryNameInput.value;
        const categoryData = { name };

        try {
            if (id) { // Update
                await fetchData(`${BASE_URL}/categories/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(categoryData)
                });
                showMessage(categoryMessage, 'Category updated successfully!', 'success');
            } else { // Create
                await fetchData(`${BASE_URL}/categories`, {
                    method: 'POST',
                    body: JSON.stringify(categoryData)
                });
                showMessage(categoryMessage, 'Category created successfully!', 'success');
            }
            categoryForm.reset();
            categoryIdInput.value = '';
            categoryFormTitle.textContent = 'Create';
            cancelCategoryButton.classList.add('hidden');
            loadCategories();
        } catch (error) {
            showMessage(categoryMessage, `Failed to save category: ${error.message}`, 'error');
        }
    }

    function editCategory(id, name) {
        categoryIdInput.value = id;
        categoryNameInput.value = name;
        categoryFormTitle.textContent = 'Update';
        cancelCategoryButton.classList.remove('hidden');
    }

    async function deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            await fetchData(`${BASE_URL}/categories/${id}`, { method: 'DELETE' });
            showMessage(categoryMessage, 'Category deleted successfully!', 'success');
            loadCategories();
            loadProducts(); // Products might have changed if category was restricted
        } catch (error) {
            showMessage(categoryMessage, `Failed to delete category: ${error.message}`, 'error');
        }
    }

    function cancelCategoryEdit() {
        categoryForm.reset();
        categoryIdInput.value = '';
        categoryFormTitle.textContent = 'Create';
        cancelCategoryButton.classList.add('hidden');
    }

    // --- Product Functions ---
    async function loadProducts() {
        const name = searchNameInput.value || null;
        const categoryId = filterCategorySelect.value || null;
        const minPrice = filterMinPriceInput.value || null;
        const maxPrice = filterMaxPriceInput.value || null;

        const params = new URLSearchParams({
            page: currentPage,
            size: 10,
            sort: 'name,asc' // Default sort
        });
        if (name) params.append('name', name);
        if (categoryId) params.append('categoryId', categoryId);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);

        try {
            const data = await fetchData(`${BASE_URL}/products?${params.toString()}`);
            displayProducts(data.content);
            currentPage = data.number; // Backend is 0-indexed, so we store it as is
            totalPages = data.totalPages;
            updatePaginationControls();
            showMessage(productMessage, 'Products loaded successfully.', 'success');
        } catch (error) {
            showMessage(productMessage, `Failed to load products: ${error.message}`, 'error');
        }
    }

    function displayProducts(products) {
        productsListDiv.innerHTML = '';
        const isAdminOrManager = checkUserRole('ROLE_ADMIN') || checkUserRole('ROLE_MANAGER');
        const isAdmin = checkUserRole('ROLE_ADMIN');

        if (products.length === 0) {
            productsListDiv.innerHTML = '<p>No products found.</p>';
            return;
        }

        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <div>
                    <strong>ID:</strong> ${product.id}<br>
                    <strong>Name:</strong> ${product.name}<br>
                    <strong>Description:</strong> ${product.description || 'N/A'}<br>
                    <strong>Price:</strong> $${product.price.toFixed(2)}<br>
                    <strong>Stock:</strong> ${product.stock}<br>
                    <strong>Category:</strong> ${product.categoryName} (${product.categoryId})
                </div>
                <div class="product-actions">
                    ${isAdminOrManager ? `<button class="edit-product" data-id="${product.id}">Edit</button>` : ''}
                    ${isAdmin ? `<button class="delete-product" data-id="${product.id}">Delete</button>` : ''}
                </div>
            `;
            productsListDiv.appendChild(productItem);
        });

        if (isAdminOrManager) {
            document.querySelectorAll('.edit-product').forEach(button => {
                button.addEventListener('click', (e) => editProduct(e.target.dataset.id));
            });
        }
        if (isAdmin) {
            document.querySelectorAll('.delete-product').forEach(button => {
                button.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
            });
        }
    }

    async function saveProduct(event) {
        event.preventDefault();
        const id = productIdInput.value;
        const name = productNameInput.value;
        const description = productDescriptionInput.value;
        const price = parseFloat(productPriceInput.value);
        const stock = parseInt(productStockInput.value);
        const categoryId = parseInt(productCategorySelect.value);

        const productData = { name, description, price, stock, categoryId };

        try {
            if (id) { // Update
                await fetchData(`${BASE_URL}/products/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(productData)
                });
                showMessage(productMessage, 'Product updated successfully!', 'success');
            } else { // Create
                await fetchData(`${BASE_URL}/products`, {
                    method: 'POST',
                    body: JSON.stringify(productData)
                });
                showMessage(productMessage, 'Product created successfully!', 'success');
            }
            productForm.reset();
            productIdInput.value = '';
            productFormTitle.textContent = 'Create';
            cancelProductButton.classList.add('hidden');
            loadProducts();
        } catch (error) {
            showMessage(productMessage, `Failed to save product: ${error.message}`, 'error');
        }
    }

    async function editProduct(id) {
        try {
            const product = await fetchData(`${BASE_URL}/products/${id}`);
            productIdInput.value = product.id;
            productNameInput.value = product.name;
            productDescriptionInput.value = product.description;
            productPriceInput.value = product.price;
            productStockInput.value = product.stock;
            productCategorySelect.value = product.categoryId;

            productFormTitle.textContent = 'Update';
            cancelProductButton.classList.remove('hidden');
        } catch (error) {
            showMessage(productMessage, `Failed to load product for editing: ${error.message}`, 'error');
        }
    }

    async function deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await fetchData(`${BASE_URL}/products/${id}`, { method: 'DELETE' });
            showMessage(productMessage, 'Product deleted successfully!', 'success');
            loadProducts();
        } catch (error) {
            showMessage(productMessage, `Failed to delete product: ${error.message}`, 'error');
        }
    }

    function cancelProductEdit() {
        productForm.reset();
        productIdInput.value = '';
        productFormTitle.textContent = 'Create';
        cancelProductButton.classList.add('hidden');
    }

    // --- Pagination Controls ---
    function updatePaginationControls() {
        currentPageSpan.textContent = currentPage + 1; // Display 1-indexed
        totalPagesSpan.textContent = totalPages;

        prevPageButton.disabled = currentPage === 0;
        nextPageButton.disabled = currentPage >= totalPages - 1;
    }

    function goToPage(offset) {
        const newPage = currentPage + offset;
        if (newPage >= 0 && newPage < totalPages) {
            currentPage = newPage;
            loadProducts();
        }
    }

    // --- Event Listeners ---
    registerForm.addEventListener('submit', registerUser);
    loginForm.addEventListener('submit', loginUser);
    logoutButton.addEventListener('click', logoutUser);
    categoryForm.addEventListener('submit', saveCategory);
    cancelCategoryButton.addEventListener('click', cancelCategoryEdit);
    productForm.addEventListener('submit', saveProduct);
    cancelProductButton.addEventListener('click', cancelProductEdit);
    refreshProductsButton.addEventListener('click', loadProducts);
    refreshCategoriesButton.addEventListener('click', loadCategories);
    applyFiltersButton.addEventListener('click', () => {
        currentPage = 0; // Reset to first page on filter change
        loadProducts();
    });
    prevPageButton.addEventListener('click', () => goToPage(-1));
    nextPageButton.addEventListener('click', () => goToPage(1));

    // Initial load
    function loadAllData() {
        loadCategories();
        loadProducts();
    }

    updateAuthStatus();
    if (jwtToken) {
        loadAllData();
    }
});
```