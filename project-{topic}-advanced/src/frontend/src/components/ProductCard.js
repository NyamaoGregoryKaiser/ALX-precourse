```javascript
import React from 'react';
import { Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <Link to={`/products/${product.id}`}>
        <img
          src={product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
          alt={product.name}
          className="w-full h-48 object-cover object-center"
        />
        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-2 truncate">{product.name}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-indigo-600">${parseFloat(product.price).toFixed(2)}</span>
            <span className="text-sm text-gray-500">Qty: {product.quantity}</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
```