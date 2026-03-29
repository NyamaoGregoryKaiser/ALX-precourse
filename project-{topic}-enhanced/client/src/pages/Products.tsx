import React, { useState, useEffect } from 'react';
import * as productService from '@/services/product.service';
import { IProduct } from '@/types/auth.d';
import Loader from '@/components/Loader';
import Alert from '@/components/Alert';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/authHelpers';

const ProductsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [newProductFormData, setNewProductFormData] = useState<Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
  });

  const canCreate = hasPermission(user, ['product:write', 'admin:access']);
  const canEdit = hasPermission(user, ['product:write', 'admin:access']);
  const canDelete = hasPermission(user, ['product:delete', 'admin:access']);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getAllProducts();
      setProducts(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch products.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProducts();
    }
  }, [authLoading]);

  const handleEditClick = (product: IProduct) => {
    setEditingProduct({ ...product });
  };

  const handleDeleteClick = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setLoading(true);
      setError(null);
      try {
        await productService.deleteProduct(productId);
        toast.success('Product deleted successfully!');
        fetchProducts();
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to delete product.';
        setError(msg);
        toast.error(msg);
        setLoading(false);
      }
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setLoading(true);
    setError(null);
    try {
      const updatedProduct = await productService.updateProduct(editingProduct.id, editingProduct);
      toast.success('Product updated successfully!');
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update product.';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleNewProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewProductFormData({ ...newProductFormData, [e.target.name]: e.target.value });
  };

  const handleNewProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await productService.createProduct(newProductFormData);
      toast.success('Product created successfully!');
      setNewProductFormData({ name: '', description: '', price: 0, stock: 0 }); // Clear form
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create product.';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto p-6 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 border-b pb-4">Product Catalog</h1>

      {error && <Alert message={error} type="error" onClose={() => setError(null)} />}

      {/* Add New Product Form */}
      {canCreate && (
        <div className="mb-8 border p-6 rounded-md bg-gray-50">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add New Product</h2>
          <form onSubmit={handleNewProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="name" placeholder="Product Name" value={newProductFormData.name} onChange={handleNewProductChange} required className="input-field" />
            <input type="number" name="price" placeholder="Price" value={newProductFormData.price} onChange={handleNewProductChange} required step="0.01" className="input-field" />
            <textarea name="description" placeholder="Description (Optional)" value={newProductFormData.description} onChange={handleNewProductChange} rows={3} className="input-field md:col-span-2"></textarea>
            <input type="number" name="stock" placeholder="Stock" value={newProductFormData.stock} onChange={handleNewProductChange} required className="input-field" />
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary w-full">Create Product</button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Available Products</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6">Name</th>
              <th className="py-3 px-6">Description</th>
              <th className="py-3 px-6">Price</th>
              <th className="py-3 px-6">Stock</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {products.map((product) => (
              <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6">{product.name}</td>
                <td className="py-3 px-6">{product.description || 'N/A'}</td>
                <td className="py-3 px-6">${product.price.toFixed(2)}</td>
                <td className="py-3 px-6">{product.stock}</td>
                <td className="py-3 px-6">
                  {canEdit && <button onClick={() => handleEditClick(product)} className="btn-secondary mr-2">Edit</button>}
                  {canDelete && <button onClick={() => handleDeleteClick(product.id)} className="btn-danger">Delete</button>}
                  {!canEdit && !canDelete && <span className="text-gray-500">No actions</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Product Modal/Form */}
      {editingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Product: {editingProduct.name}</h2>
            <form onSubmit={handleUpdateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-gray-700 text-sm font-bold mt-2">Product Name:</label>
              <input type="text" name="name" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} required className="input-field col-span-2 md:col-span-1" />

              <label className="block text-gray-700 text-sm font-bold mt-2">Price:</label>
              <input type="number" name="price" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} required step="0.01" className="input-field col-span-2 md:col-span-1" />

              <label className="block text-gray-700 text-sm font-bold mt-2">Description:</label>
              <textarea name="description" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} rows={3} className="input-field col-span-2"></textarea>

              <label className="block text-gray-700 text-sm font-bold mt-2">Stock:</label>
              <input type="number" name="stock" value={editingProduct.stock} onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })} required className="input-field col-span-2 md:col-span-1" />

              <div className="md:col-span-2 flex justify-end space-x-4 mt-6">
                <button type="button" onClick={() => setEditingProduct(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;