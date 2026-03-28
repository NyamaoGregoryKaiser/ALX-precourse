import ProductList from '@/components/ProductList';

export default function HomePage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Welcome to Our Store!</h1>
      <ProductList />
    </div>
  );
}