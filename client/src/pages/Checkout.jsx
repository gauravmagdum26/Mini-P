import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/axios';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import DeliveryLocationPicker from '../components/DeliveryLocationPicker';
import { calculateDeliveryFee, getDistanceKm } from '../lib/deliveryPricing';
import { MapPin, CheckCircle, CreditCard, Banknote, ArrowLeft } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useContext(AuthContext);
  const { cart, subtotal, clearCart } = useCart();
  const orderPlaced = useRef(false);
  
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI QR');
  const [fulfillmentMethod, setFulfillmentMethod] = useState('Self-Pickup');
  const [deliveryRateState, setDeliveryRateState] = useState(null);
  const currentDeliveryRateState = deliveryRateState?.artisanId === cart.artisanId ? deliveryRateState : null;
  const deliveryRates = currentDeliveryRateState?.rates || null;
  const deliveryRatesError = currentDeliveryRateState?.error || '';
  const deliveryRatesLoading = Boolean(cart.artisanId) && !currentDeliveryRateState;
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
    coordinates: null
  });
  const hasInvalidStock = cart.items.some(item => item.stockQuantity < item.quantity || item.quantity < 1);

  useEffect(() => {
    if (!cart.artisanId) return undefined;

    let active = true;
    api.get(`/artisans/${cart.artisanId}/fulfillment`)
      .then(({ data }) => {
        if (!active) return;
        setDeliveryRateState({ artisanId: cart.artisanId, rates: data.data });
      })
      .catch(err => {
        if (!active) return;
        setDeliveryRateState({
          artisanId: cart.artisanId,
          error: err.response?.data?.message || 'Could not load the artisan’s delivery rates.',
        });
      });

    return () => {
      active = false;
    };
  }, [cart.artisanId]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login', { replace: true, state: { from: '/checkout' } });
      return;
    }

    if (user.role !== 'buyer') {
      navigate(user.role === 'artisan' ? '/dashboard' : '/', { replace: true });
      return;
    }
    if (cart.items.length === 0 && !orderPlaced.current) navigate('/cart', { replace: true });
  }, [cart.items.length, user, authLoading, navigate]);

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    if (!deliveryRates || deliveryRatesLoading) {
      alert('The artisan’s delivery rates are still loading. Please try again.');
      return;
    }
    if (cart.items.length === 0 || hasInvalidStock) {
      alert('The cart is empty or contains quantities that are no longer in stock. Review the cart before checkout.');
      return;
    }
    if (fulfillmentMethod === 'Delivery') {
      const { street, city, state, postalCode, phone, coordinates } = deliveryAddress;
      if (
        street.trim().length < 5 || street.trim().length > 160 ||
        city.trim().length < 2 || city.trim().length > 80 ||
        state.trim().length < 2 || state.trim().length > 80 ||
        !/^[0-9]{6}$/.test(postalCode) ||
        !/^[0-9]{10}$/.test(phone) ||
        !Array.isArray(coordinates) || coordinates.length !== 2
      ) {
        alert('Check the delivery address, six-digit PIN code, 10-digit phone number, and selected map point.');
        return;
      }
    }

    try {
      setPlacingOrder(true);
      const orderData = {
        products: cart.items.map(item => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        artisan: cart.artisanId,
        fulfillmentMethod,
        ...(fulfillmentMethod === 'Delivery' && { deliveryAddress }),
        ...(fulfillmentMethod === 'Delivery' && { expectedDeliveryFee: deliveryFee }),
        paymentMethod
      };

      const { data } = await api.post('/orders', orderData);
      orderPlaced.current = true;
      clearCart();
      navigate(`/order/${data.data._id}`, { replace: true });
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409 && fulfillmentMethod === 'Delivery') {
        try {
          const { data } = await api.get(`/artisans/${cart.artisanId}/fulfillment`);
          setDeliveryRateState({ artisanId: cart.artisanId, rates: data.data });
        } catch (refreshError) {
          setDeliveryRateState({
            artisanId: cart.artisanId,
            error: refreshError.response?.data?.message || 'Could not refresh the artisan’s delivery rates.',
          });
        }
      }
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (authLoading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>;
  if (!user || user.role !== 'buyer' || cart.items.length === 0) return <div className="text-center p-12">Opening your cart...</div>;
  if (deliveryRatesLoading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" /></div>;
  if (!deliveryRates) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <p className="text-red-700">{deliveryRatesError || 'Could not load the artisan’s delivery rates.'}</p>
        <button type="button" onClick={() => navigate('/cart')} className="mt-4 text-sm font-medium text-amber-700 hover:text-amber-800">
          Return to cart
        </button>
      </div>
    );
  }
  const artisan = cart.artisan;
  const artisanLocation = artisan?.location?.coordinates;
  const upiId = artisan?.artisanData?.upiId || 'test@upi';
  const deliveryDistanceKm = deliveryAddress.coordinates && artisanLocation
    ? getDistanceKm(artisanLocation, deliveryAddress.coordinates)
    : null;
  const deliveryBaseFee = deliveryRates.deliveryBaseFee;
  const deliveryPerKmRate = deliveryRates.deliveryPerKmRate;
  const deliveryFee = fulfillmentMethod === 'Delivery'
    ? calculateDeliveryFee(deliveryBaseFee, deliveryPerKmRate, deliveryDistanceKm ?? 0)
    : 0;
  const totalAmount = subtotal + deliveryFee;
  const upiUrl = `upi://pay?pa=${upiId}&pn=${artisan?.artisanData?.shopName}&am=${totalAmount.toFixed(2)}&cu=INR`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          title="Go Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Complete Your Order</h1>
      </div>
      
      <form onSubmit={handlePlaceOrder}>
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Fulfillment Method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Self-Pickup', 'Delivery'].map(method => (
                <label key={method} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer ${fulfillmentMethod === method ? 'border-amber-600 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="fulfillment" value={method} checked={fulfillmentMethod === method} onChange={() => setFulfillmentMethod(method)} className="mt-1 text-amber-600 focus:ring-amber-500" />
                  <span>
                    <span className="block font-medium text-gray-900">{method}</span>
                    <span className="mt-1 block text-sm text-gray-500">
                      {method === 'Delivery'
                        ? deliveryDistanceKm === null
                          ? `₹${deliveryBaseFee.toFixed(2)} base + ₹${deliveryPerKmRate.toFixed(2)} per km; select a map point for the total fee.`
                          : `${deliveryDistanceKm.toFixed(2)} km · ₹${deliveryFee.toFixed(2)} delivery fee.`
                        : 'Collect your order from the artisan’s shop.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {fulfillmentMethod === 'Delivery' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
                <MapPin className="text-amber-600" /> Delivery Location
              </h2>
              <DeliveryLocationPicker
                location={deliveryAddress.coordinates}
                artisanLocation={artisanLocation}
                onChange={(coordinates, addressFields) => setDeliveryAddress(current => ({
                  ...current,
                  ...addressFields,
                  coordinates,
                }))}
              />
            </div>
          )}

          {fulfillmentMethod === 'Delivery' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 block text-sm font-medium text-gray-700">
                  Street address
                  <input required minLength={5} maxLength={160} autoComplete="street-address" value={deliveryAddress.street} onChange={e => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  City
                  <input required minLength={2} maxLength={80} autoComplete="address-level2" value={deliveryAddress.city} onChange={e => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  State
                  <input required minLength={2} maxLength={80} autoComplete="address-level1" value={deliveryAddress.state} onChange={e => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  PIN code
                  <input required inputMode="numeric" autoComplete="postal-code" maxLength={6} pattern="[0-9]{6}" value={deliveryAddress.postalCode} onChange={e => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Phone number
                  <input required type="tel" inputMode="numeric" autoComplete="tel" minLength={10} maxLength={10} pattern="[0-9]{10}" title="Enter exactly 10 digits" value={deliveryAddress.phone} onChange={e => {
                    const phone = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setDeliveryAddress({ ...deliveryAddress, phone });
                  }} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900" />
                </label>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h2>
            <div className="space-y-4">
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'UPI QR' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="payment" value="UPI QR" checked={paymentMethod === 'UPI QR'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-amber-600 focus:ring-amber-500" />
                <div className="ml-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">Zero-Fee UPI QR</span>
                </div>
              </label>
              
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'Cash' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="payment" value="Cash" checked={paymentMethod === 'Cash'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-amber-600 focus:ring-amber-500" />
                <div className="ml-3 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">Cash on {fulfillmentMethod === 'Delivery' ? 'Delivery' : 'Pickup'}</span>
                </div>
              </label>
            </div>

            {paymentMethod === 'UPI QR' && (
              <div className="mt-6 flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm font-medium text-gray-900 mb-4">Scan with any UPI App (GPay, PhonePe, Paytm)</p>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <QRCodeSVG value={upiUrl} size={150} level="H" />
                </div>
                <p className="mt-4 text-xs text-gray-500 text-center">Amount: ₹{totalAmount}<br/>Paying to: {upiId}</p>
                <p className="mt-2 text-xs font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Zero transaction fees. 100% goes to the artisan.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 mt-8 lg:mt-0">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-8">
            <h2 className="text-lg font-medium text-gray-900">Order from {cart.artisanName}</h2>
            <p className={`mt-1 mb-4 text-sm ${hasInvalidStock ? 'text-red-700' : 'text-gray-500'}`}>
              {hasInvalidStock ? 'Some cart quantities exceed current stock. Return to cart to review.' : `${cart.items.length} products · ${cart.items.reduce((sum, item) => sum + item.quantity, 0)} items`}
            </p>
            <ul className="divide-y divide-gray-100 border-y border-gray-100">
              {cart.items.map(item => (
                <li key={item.productId} className="flex items-center gap-3 py-3">
                  <img src={item.imageUrl || 'https://via.placeholder.com/80'} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty {item.quantity} · ₹{item.price} each</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-gray-900">₹{item.price * item.quantity}</p>
                </li>
              ))}
            </ul>
            
            <dl className="space-y-4 py-4 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-medium text-gray-900">₹{subtotal}</dd>
              </div>
              <div className={`flex justify-between ${deliveryFee ? 'text-gray-600' : 'text-green-600'}`}>
                <dt>Delivery Fee</dt>
                <dd className="font-medium">
                  {fulfillmentMethod === 'Delivery' && deliveryDistanceKm === null
                    ? 'Select delivery point'
                    : `₹${deliveryFee.toFixed(2)}${deliveryFee === 0 && fulfillmentMethod !== 'Delivery' ? ' (Self-Pickup)' : ''}`}
                </dd>
              </div>
              <div className="flex justify-between text-green-600">
                <dt>Platform Fee</dt>
                <dd className="font-medium">₹0.00</dd>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                <dt className="text-base font-medium text-gray-900">Total</dt>
                <dd className="text-xl font-bold text-amber-600">₹{totalAmount}</dd>
              </div>
            </dl>

            <button
              type="submit"
              disabled={placingOrder || cart.items.length === 0 || hasInvalidStock}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {placingOrder ? 'Confirming...' : fulfillmentMethod === 'Delivery' ? 'Place Delivery Order' : 'Confirm Order & Prepare Pickup'}
            </button>
          </div>
        </div>
      </div>
      </form>
    </div>
  );
};

export default Checkout;
