import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import { MapPin, Compass } from 'lucide-react';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  
  useEffect(() => {
    const fetchProducts = async (lng, lat) => {
      try {
        let url = '/products';
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          url += `?lng=${lng}&lat=${lat}`;
        }
        const { data } = await api.get(url);
        setProducts(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchProducts(pos.coords.longitude, pos.coords.latitude);
        },
        (err) => {
          setLocationError('Location access denied. Showing all products.');
          fetchProducts(); // fetch without location (maybe backend handles this by returning all or failing, wait, backend requires lng/lat if geoNear is used. Let's check backend controller).
        }
      );
    } else {
      setLocationError('Geolocation not supported.');
      fetchProducts();
    }
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Hero Section */}
      <div className="relative bg-gray-900 overflow-hidden h-[600px] flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=2070&auto=format&fit=crop"
            alt="Handcrafted pottery and tools"
            className="w-full h-full object-cover opacity-60"
          />
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl mb-6">
            <span className="block drop-shadow-md">Uncover Unique,</span>
            <span className="block text-amber-400 drop-shadow-md mt-2">Handcrafted Masterpieces</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-200 drop-shadow">
            Connect directly with local artisans in your community. Discover bespoke, beautifully crafted goods with no middlemen and zero hidden fees.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <a
              href="#products"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-full text-gray-900 bg-amber-400 hover:bg-amber-500 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer"
            >
              Start Exploring
            </a>
          </div>
        </div>
      </div>

      <div id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Compass className="h-8 w-8 text-amber-600" />
            Featured Nearby
          </h2>
        </div>
        
        {locationError && (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md mb-6 text-sm">
            {locationError}
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found near you.
          </div>
        ) : (
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
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-lg font-bold text-amber-600">₹{product.price}</p>
                      {product.distance !== undefined && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {(product.distance / 1000).toFixed(1)} km
                        </p>
                      )}
                    </div>
                    <p className={`mt-1 text-sm font-medium ${(product.stockQuantity ?? 0) > 0 ? 'text-gray-600' : 'text-red-700'}`}>
                      {(product.stockQuantity ?? 0) > 0 ? `${product.stockQuantity} in stock` : 'Sold out'}
                    </p>
                    <div className="mt-3 text-sm text-gray-600 border-t pt-3">
                      By <span className="font-medium">{product.artisanDetails?.artisanData?.shopName || product.artisan?.artisanData?.shopName || 'Unknown Shop'}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
