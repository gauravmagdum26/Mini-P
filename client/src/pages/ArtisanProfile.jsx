import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { Store, MapPin, ArrowLeft } from 'lucide-react';

const ArtisanProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [artisan, setArtisan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/products');
        // Find products by this artisan
        const artisanProducts = data.data.filter(p => {
          const artisanId = p.artisanDetails?._id || p.artisan?._id;
          return artisanId === id;
        });
        setProducts(artisanProducts);

        if (artisanProducts.length > 0) {
          setArtisan(artisanProducts[0].artisanDetails || artisanProducts[0].artisan);
        } else {
          // Fallback if we had a dedicated artisan endpoint, which we don't.
          // For now, if no products, we can't show much.
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>;
  if (!artisan && products.length === 0) return <div className="text-center p-12">Artisan not found or has no products.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
        <div className="h-48 bg-amber-600"></div>
        <div className="px-8 pb-8">
          <div className="-mt-16 flex items-end gap-6 mb-6">
            <div className="h-32 w-32 rounded-xl border-4 border-white bg-amber-100 flex items-center justify-center shadow-md">
              <Store className="h-16 w-16 text-amber-600" />
            </div>
            <div className="pb-2">
              <h1 className="text-3xl font-bold text-gray-900">{artisan?.artisanData?.shopName}</h1>
              <p className="text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" /> Local Artisan
              </p>
            </div>
          </div>
          
          <div className="prose max-w-none text-gray-600">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Our Story</h3>
            <p className="whitespace-pre-line">{artisan?.artisanData?.bio || 'No bio provided.'}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Crafted by {artisan?.artisanData?.shopName}</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link key={product._id} to={`/product/${product._id}`} className="group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
                <img
                  src={product.images[0]?.url || 'https://via.placeholder.com/400'}
                  alt={product.name}
                  className="h-48 w-full object-cover object-center group-hover:opacity-75 transition-opacity"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="mt-2 text-lg font-bold text-amber-600">₹{product.price}</p>
                <p className={`mt-1 text-sm font-medium ${(product.stockQuantity ?? 0) > 0 ? 'text-gray-600' : 'text-red-700'}`}>
                  {(product.stockQuantity ?? 0) > 0 ? `${product.stockQuantity} in stock` : 'Sold out'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ArtisanProfile;
