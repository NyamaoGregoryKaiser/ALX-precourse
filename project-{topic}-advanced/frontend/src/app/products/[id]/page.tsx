import ProductDetail from '@/components/ProductDetail';

interface ProductPageProps {
  params: {
    id: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = params;
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Product Details</h1>
      <ProductDetail productId={id} />
    </div>
  );
}