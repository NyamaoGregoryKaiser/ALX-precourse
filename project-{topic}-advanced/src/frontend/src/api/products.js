```javascript
import api from './axiosInstance';

export const getProducts = async (params = {}) => {
  try {
    const response = await api.get('/products', { params });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const getProductById = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const createProduct = async (productData) => {
  try {
    const response = await api.post('/products', productData);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateProduct = async (id, productData) => {
  try {
    const response = await api.patch(`/products/${id}`, productData);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteProduct = async (id) => {
  try {
    await api.delete(`/products/${id}`);
    return true;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};
```