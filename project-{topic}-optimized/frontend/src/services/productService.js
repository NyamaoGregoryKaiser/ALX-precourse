import api from './api';

export const getAllProducts = (page = 1, limit = 10, search = '') => {
  return api.get('/products', {
    params: { page, limit, search },
  });
};

export const getProductById = (id) => {
  return api.get(`/products/${id}`);
};

export const createProduct = (productData) => {
  return api.post('/products', productData);
};

export const updateProduct = (id, productData) => {
  return api.put(`/products/${id}`, productData);
};

export const deleteProduct = (id) => {
  return api.delete(`/products/${id}`);
};
```