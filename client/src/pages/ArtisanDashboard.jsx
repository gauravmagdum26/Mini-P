import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { AuthContext } from '../context/AuthContext';
import DeliveryOrderMap from '../components/DeliveryOrderMap';
import { Plus, Package, ClipboardList, Check, Trash2, Eye, EyeOff, ArrowLeft, MapPin, Share2, Copy, Banknote, Store } from 'lucide-react';

const getDeliveryShareText = (order) => {
  const { deliveryAddress } = order;
  const coordinates = deliveryAddress.coordinates;
  const mapLink = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`
    : 'No map pin was saved';

  return [
    `Delivery for order #${order._id.slice(-6).toUpperCase()}`,
    `Address: ${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postalCode}`,
    `Phone: ${deliveryAddress.phone}`,
    `Map: ${mapLink}`,
  ].join('\n');
};

const ArtisanDashboard = () => {
  const { user, loading: authLoading, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [openDeliveryMapId, setOpenDeliveryMapId] = useState(null);
  const [copiedDeliveryOrderId, setCopiedDeliveryOrderId] = useState(null);
  const [deliveryRateOverrides, setDeliveryRateOverrides] = useState(null);
  const [savingDeliveryRates, setSavingDeliveryRates] = useState(false);
  const [deliveryRateMessage, setDeliveryRateMessage] = useState(null);
  const [profileOverrides, setProfileOverrides] = useState(null);
  const profileForm = profileOverrides || (() => {
    const [longitude, latitude] = user?.location?.coordinates || [];
    return {
      name: user?.name || '',
      shopName: user?.artisanData?.shopName || '',
      bio: user?.artisanData?.bio || '',
      upiId: user?.artisanData?.upiId || '',
      longitude: Number.isFinite(longitude) ? String(longitude) : '',
      latitude: Number.isFinite(latitude) ? String(latitude) : '',
    };
  })();
  const [savingProfile, setSavingProfile] = useState(false);
  const [locatingProfile, setLocatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const deliveryBaseFee = deliveryRateOverrides?.deliveryBaseFee ?? user?.artisanData?.deliveryBaseFee ?? 15;
  const deliveryPerKmRate = deliveryRateOverrides?.deliveryPerKmRate ?? user?.artisanData?.deliveryPerKmRate ?? 2;

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockValues, setStockValues] = useState({});
  const [tags, setTags] = useState('');
  const [images, setImages] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || user?.role !== 'artisan') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [prodRes, ordRes] = await Promise.all([
          api.get('/products/me'),
          api.get('/orders/shop')
        ]);
        setProducts(prodRes.data.data);
        // Filter orders meant for this artisan is no longer needed since shop endpoint does it
        setOrders(ordRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading, navigate]);

  const handleSaveDeliveryRates = async event => {
    event.preventDefault();
    try {
      setSavingDeliveryRates(true);
      setDeliveryRateMessage(null);
      const { data } = await api.put('/artisans/me/delivery-rates', {
        deliveryBaseFee: Number(deliveryBaseFee),
        deliveryPerKmRate: Number(deliveryPerKmRate),
      });
      setDeliveryRateOverrides(data.data);
      setDeliveryRateMessage({ type: 'success', text: 'Delivery rates saved.' });
    } catch (err) {
      setDeliveryRateMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not save delivery rates.',
      });
    } finally {
      setSavingDeliveryRates(false);
    }
  };

  const handleSaveProfile = async event => {
    event.preventDefault();
    const longitude = Number(profileForm.longitude);
    const latitude = Number(profileForm.latitude);
    if (
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    ) {
      setProfileMessage({ type: 'error', text: 'Enter a valid shop longitude and latitude.' });
      return;
    }

    try {
      setSavingProfile(true);
      setProfileMessage(null);
      const { data } = await api.put('/artisans/me/profile', {
        name: profileForm.name,
        shopName: profileForm.shopName,
        bio: profileForm.bio,
        upiId: profileForm.upiId,
        coordinates: [longitude, latitude],
      });
      updateUser(data.data);
      setProfileOverrides(null);
      setProfileMessage({ type: 'success', text: 'Shop profile updated successfully.' });
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not update your shop profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const captureShopLocation = () => {
    if (!navigator.geolocation) {
      setProfileMessage({ type: 'error', text: 'Location is unavailable in this browser. Enter coordinates manually.' });
      return;
    }

    setLocatingProfile(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setProfileOverrides(current => ({
          ...(current || profileForm),
          longitude: String(coords.longitude),
          latitude: String(coords.latitude),
        }));
        setProfileMessage(null);
        setLocatingProfile(false);
      },
      () => {
        setProfileMessage({ type: 'error', text: 'Could not access your location. Allow location access or enter coordinates manually.' });
        setLocatingProfile(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const numericPrice = Number(price);
    const numericStock = Number(stockQuantity);
    const tagList = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (normalizedName.length < 2 || normalizedDescription.length < 10 || !Number.isFinite(numericPrice) || numericPrice < 1 || numericPrice > 10000000 || Math.abs(numericPrice * 100 - Math.round(numericPrice * 100)) > 1e-8) {
      alert('Enter a product name, a description of at least 10 characters, and a price from ₹1 to ₹10000000 with up to 2 decimal places.');
      return;
    }
    if (stockQuantity === '' || !Number.isInteger(numericStock) || numericStock < 0 || numericStock > 1000000) {
      alert('Enter a whole-number stock quantity from 0 to 1000000.');
      return;
    }
    if (tagList.length > 10 || tagList.some(tag => tag.length > 30)) {
      alert('Use at most 10 tags, each no longer than 30 characters.');
      return;
    }
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!images?.length || images.length > 5 || Array.from(images).some(file => !allowedImageTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      alert('Select 1 to 5 JPG, PNG, or WebP images, each no larger than 5 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('name', normalizedName);
    formData.append('description', normalizedDescription);
    formData.append('price', numericPrice);
    formData.append('stockQuantity', numericStock);
    tagList.forEach(tag => formData.append('tags[]', tag));
    if (images) {
      Array.from(images).forEach(file => formData.append('images', file));
    }

    try {
      const { data } = await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProducts([...products, data.data]);
      // reset form
      setName(''); setDescription(''); setPrice(''); setStockQuantity(''); setTags(''); setImages(null);
      alert('Product added successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to add product');
    }
  };

  const handleUpdateStock = async (event, productId) => {
    event.preventDefault();
    const value = Number(stockValues[productId]);
    if (!Number.isInteger(value) || value < 0 || value > 1000000) {
      alert('Stock must be a whole number from 0 to 1000000.');
      return;
    }

    try {
      const { data } = await api.put(`/products/${productId}/stock`, { stockQuantity: value });
      setProducts(current => current.map(product => product._id === productId ? data.data : product));
      setStockValues(current => ({ ...current, [productId]: String(value) }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${productId}`);
      setProducts(products.filter(p => p._id !== productId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete product');
    }
  };

  const handleToggleAvailability = async (productId, currentStatus) => {
    try {
      // If isAvailable is undefined (old data), treat it as true currently
      const status = currentStatus !== undefined ? currentStatus : true;
      const { data } = await api.put(`/products/${productId}/availability`, { isAvailable: !status });
      setProducts(products.map(p => p._id === productId ? data.data : p));
    } catch (err) {
      console.error(err);
      alert('Failed to update product availability');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status });
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: data.data.status } : o));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const shareDeliveryDetails = async (order) => {
    const text = getDeliveryShareText(order);

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Delivery details', text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert('Delivery details copied. You can paste them into a message.');
      } else {
        window.prompt('Copy these delivery details:', text);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Could not share delivery details. Please try again.');
      }
    }
  };

  const copyDeliveryDetails = async (order) => {
    const text = getDeliveryShareText(order);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        window.prompt('Copy the delivery details and map link:', text);
        return;
      }
      setCopiedDeliveryOrderId(order._id);
      window.setTimeout(() => {
        setCopiedDeliveryOrderId(current => current === order._id ? null : current);
      }, 2000);
    } catch {
      window.prompt('Copy the delivery details and map link:', text);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this completed order? This action cannot be undone.')) return;
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders(orders.filter(o => o._id !== orderId));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete order');
    }
  };

  if (authLoading || loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Artisan Dashboard
          </h2>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex flex-wrap gap-x-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`${activeTab === 'products' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Package className="h-4 w-4" /> My Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`${activeTab === 'orders' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <ClipboardList className="h-4 w-4" /> Orders & Fulfillment
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`${activeTab === 'delivery' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Banknote className="h-4 w-4" /> Delivery Rates
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`${activeTab === 'profile' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Store className="h-4 w-4" /> Shop Profile
          </button>
        </nav>
      </div>

      {activeTab === 'profile' && (
        <div className="max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Update your shop profile</h3>
          <p className="mt-1 text-sm text-gray-600">
            These details appear on your public artisan shop and are used for checkout payments and delivery distance.
          </p>
          <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              Your name
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={profileForm.name}
                onChange={event => setProfileOverrides(current => ({ ...(current || profileForm), name: event.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Shop name
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                autoComplete="organization"
                value={profileForm.shopName}
                onChange={event => setProfileOverrides(current => ({ ...(current || profileForm), shopName: event.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Shop story
              <textarea
                rows="4"
                minLength={10}
                maxLength={500}
                value={profileForm.bio}
                onChange={event => setProfileOverrides(current => ({ ...(current || profileForm), bio: event.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">Leave blank or enter 10 to 500 characters.</span>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              UPI ID
              <input
                type="text"
                required
                maxLength={100}
                pattern="[A-Za-z0-9._-]+@[A-Za-z0-9][A-Za-z0-9.-]*"
                title="Enter a valid UPI ID, such as name@bank"
                value={profileForm.upiId}
                onChange={event => setProfileOverrides(current => ({ ...(current || profileForm), upiId: event.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">Shop location</legend>
              <p className="mt-1 text-xs text-gray-500">Coordinates are longitude and latitude, used to calculate delivery distance.</p>
              <button
                type="button"
                disabled={locatingProfile}
                onClick={captureShopLocation}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
              >
                <MapPin className="h-4 w-4" />
                {locatingProfile ? 'Finding location...' : 'Use current location'}
              </button>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-gray-700">
                  Longitude
                  <input
                    type="number"
                    required
                    min="-180"
                    max="180"
                    step="any"
                    value={profileForm.longitude}
                    onChange={event => setProfileOverrides(current => ({ ...(current || profileForm), longitude: event.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Latitude
                  <input
                    type="number"
                    required
                    min="-90"
                    max="90"
                    step="any"
                    value={profileForm.latitude}
                    onChange={event => setProfileOverrides(current => ({ ...(current || profileForm), latitude: event.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </label>
              </div>
            </fieldset>
            {profileMessage && (
              <p role="status" className={`text-sm ${profileMessage.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                {profileMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save shop profile'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'delivery' && (
        <div className="max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Distance-based delivery charges</h3>
          <p className="mt-1 text-sm text-gray-600">
            The checkout fee is calculated from the straight-line distance between your shop and the buyer’s selected map point.
          </p>
          <form onSubmit={handleSaveDeliveryRates} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              Base delivery fee (₹)
              <input
                type="number"
                min="0"
                max="100000"
                step="0.01"
                required
                value={deliveryBaseFee}
                onChange={event => setDeliveryRateOverrides(current => ({
                  ...current,
                  deliveryBaseFee: event.target.value,
                }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Additional charge per kilometre (₹/km)
              <input
                type="number"
                min="0"
                max="10000"
                step="0.01"
                required
                value={deliveryPerKmRate}
                onChange={event => setDeliveryRateOverrides(current => ({
                  ...current,
                  deliveryPerKmRate: event.target.value,
                }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <p className="text-sm text-gray-500">
              Example: ₹{Number(deliveryBaseFee || 0).toFixed(2)} base + ₹{Number(deliveryPerKmRate || 0).toFixed(2)} × delivery distance.
            </p>
            {deliveryRateMessage && (
              <p role="status" className={`text-sm ${deliveryRateMessage.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                {deliveryRateMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingDeliveryRates}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
            >
              {savingDeliveryRates ? 'Saving...' : 'Save delivery rates'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-600" /> Add New Product
            </h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input type="text" required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea required minLength={10} maxLength={2000} rows="3" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                <input type="number" min="1" max="10000000" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock quantity</label>
                <input type="number" name="stockQuantity" min="0" max="1000000" step="1" required value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                <input type="text" maxLength={200} value={tags} onChange={e => setTags(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" placeholder="e.g. pottery, handmade, clay" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Images</label>
                <input type="file" required multiple accept="image/jpeg,image/png,image/webp" onChange={e => setImages(e.target.files)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
              </div>
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none">
                Save Product
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {products.map(product => (
                <div key={product._id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group ${product.isAvailable === false ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                  <div className="absolute top-2 right-2 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleToggleAvailability(product._id, product.isAvailable)}
                      className="p-2 bg-white/80 hover:bg-gray-100 text-gray-700 rounded-full shadow-sm"
                      title={product.isAvailable !== false ? "Mark Unavailable" : "Mark Available"}
                    >
                      {product.isAvailable !== false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product._id)}
                      className="p-2 bg-white/80 hover:bg-red-50 text-red-600 rounded-full shadow-sm"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <img src={product.images[0]?.url || 'https://via.placeholder.com/400'} alt={product.name} className="h-48 w-full object-cover" />
                  <div className="p-4 flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        {product.name}
                        {product.isAvailable === false && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">Hidden</span>}
                      </h4>
                      <p className="mt-1 text-lg font-bold text-amber-600">₹{product.price}</p>
                      <p className={`mt-1 text-sm font-medium ${product.stockQuantity > 0 ? 'text-gray-600' : 'text-red-700'}`}>
                        {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Sold out'}
                      </p>
                      <form onSubmit={event => handleUpdateStock(event, product._id)} className="mt-3 flex items-end gap-2">
                        <label className="text-xs text-gray-600">
                          Update stock
                          <input
                            type="number"
                            name="stockQuantity"
                            min="0"
                            max="1000000"
                            step="1"
                            required
                            value={stockValues[product._id] ?? String(product.stockQuantity ?? 0)}
                            onChange={event => setStockValues(current => ({ ...current, [product._id]: event.target.value }))}
                            className="mt-1 block w-24 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
                          />
                        </label>
                        <button type="submit" className="rounded bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                          Save
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                  You haven't added any products yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white shadow-sm overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {orders.map(order => (
              <li key={order._id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 truncate">Order #{order._id.slice(-6).toUpperCase()}</p>
                    <div className="mt-2 flex">
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium text-gray-900 mr-2">Items:</span>
                        {order.products.map((p, i) => <span key={i}>{p.product.name} (x{p.quantity})</span>)}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{order.fulfillmentMethod === 'Delivery' ? 'Delivery' : 'Self-Pickup'}</span>
                      {order.fulfillmentMethod === 'Delivery' && (
                        <>
                          <span className="capitalize">: {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</span>
                          <span> · {order.deliveryAddress.phone}</span>
                        </>
                      )}
                    </p>
                    {order.fulfillmentMethod === 'Delivery' && (
                      <p className="mt-1 text-xs text-gray-500">
                        {Number.isFinite(order.deliveryDistanceKm) ? `${order.deliveryDistanceKm.toFixed(2)} km · ` : ''}
                        Delivery fee ₹{Number(order.deliveryFee || 0).toFixed(2)}
                      </p>
                    )}
                    {order.fulfillmentMethod === 'Delivery' && order.deliveryAddress.coordinates && (
                      <div className="mt-2">
                        <button
                          type="button"
                          aria-expanded={openDeliveryMapId === order._id}
                          onClick={() => setOpenDeliveryMapId(current => current === order._id ? null : order._id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
                        >
                          <MapPin className="h-4 w-4" />
                          {openDeliveryMapId === order._id ? 'Hide delivery map' : 'Show delivery map'}
                        </button>
                        {openDeliveryMapId === order._id && (
                          <DeliveryOrderMap coordinates={order.deliveryAddress.coordinates} />
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${order.deliveryAddress.coordinates[1]},${order.deliveryAddress.coordinates[0]}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-3 text-sm text-gray-600 underline hover:text-gray-800"
                        >
                          Open in Maps
                        </a>
                      </div>
                    )}
                    {order.fulfillmentMethod === 'Delivery' && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                        <button
                          type="button"
                          onClick={() => shareDeliveryDetails(order)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
                        >
                          <Share2 className="h-4 w-4" /> Share delivery details
                        </button>
                        <button
                          type="button"
                          onClick={() => copyDeliveryDetails(order)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          <Copy className="h-4 w-4" />
                          {copiedDeliveryOrderId === order._id ? 'Copied' : 'Copy details & map link'}
                        </button>
                      </div>
                    )}
                    {order.fulfillmentMethod === 'Delivery' && !order.deliveryAddress.coordinates && (
                      <p className="mt-2 text-sm text-gray-500">No map location was saved for this order.</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${order.status === 'Cancelled' ? 'bg-red-100 text-red-800' : order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        ['Ready for Pickup', 'Out for Delivery'].includes(order.status) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {order.status}
                    </span>
                    {order.status === 'Cancelled' && (
                      <span className="text-xs text-red-700">Cancelled by buyer</span>
                    )}
                    {order.status === 'Pending' && (
                      <button onClick={() => updateOrderStatus(order._id, order.fulfillmentMethod === 'Delivery' ? 'Out for Delivery' : 'Ready for Pickup')} className="text-xs bg-amber-600 text-white hover:bg-amber-700 px-2 py-1 rounded flex items-center gap-1"><Check className="h-3 w-3"/> {order.fulfillmentMethod === 'Delivery' ? 'Mark Out for Delivery' : 'Mark Ready for Pickup'}</button>
                    )}
                    {order.status === 'Ready for Pickup' && (
                      <button onClick={() => updateOrderStatus(order._id, 'Completed')} className="text-xs bg-green-600 text-white hover:bg-green-700 px-2 py-1 rounded">Mark Completed (Picked up)</button>
                    )}
                    {order.status === 'Out for Delivery' && (
                      <button onClick={() => updateOrderStatus(order._id, 'Delivered')} className="text-xs bg-green-600 text-white hover:bg-green-700 px-2 py-1 rounded">Mark Delivered</button>
                    )}
                    {['Completed', 'Delivered'].includes(order.status) && (
                      <button onClick={() => handleDeleteOrder(order._id)} className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded flex items-center gap-1"><Trash2 className="h-3 w-3"/> Delete Record</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {orders.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500">No orders yet.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ArtisanDashboard;
