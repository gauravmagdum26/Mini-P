import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { Package, Clock, CheckCircle, Navigation } from 'lucide-react';

const OrderTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestingCancellation, setRequestingCancellation] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get('/orders/myorders');
        const found = data.data.find(o => o._id === id);
        setOrder(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const cancelOrder = async () => {
    if (!window.confirm('Cancel this pending Cash on Delivery order? Payment is collected on delivery, so no payment has been collected yet.')) return;
    setRequestingCancellation(true);
    try {
      const { data } = await api.put(`/orders/${order._id}/cancel`);
      setOrder(data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel the order.');
    } finally {
      setRequestingCancellation(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>;
  if (!order) return <div className="text-center p-12">Order not found</div>;

  const isDelivery = order.fulfillmentMethod === 'Delivery';
  const statuses = isDelivery
    ? ['Pending', 'Out for Delivery', 'Delivered']
    : ['Pending', 'Ready for Pickup', 'Completed'];
  const currentStatusIdx = order.status === 'Cancelled' ? -1 : statuses.indexOf(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          title="Go Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-amber-50">
          <h1 className="text-2xl font-bold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</h1>
          <p className="mt-2 text-sm text-amber-800">{order.status === 'Cancelled' ? 'You cancelled this order.' : isDelivery ? 'Your artisan will deliver this order to your address.' : 'Please prepare for self-pickup.'}</p>
        </div>

        <div className="p-8">
          {order.status === 'Cancelled' && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              This order was cancelled and will not be fulfilled.
            </div>
          )}
          {order.status === 'Pending' && order.paymentMethod === 'Cash' && order.fulfillmentMethod === 'Delivery' && (
            <div className="mb-6 text-right">
              <button
                type="button"
                disabled={requestingCancellation}
                onClick={cancelOrder}
                className="text-sm font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
              >
                {requestingCancellation ? 'Cancelling...' : 'Cancel order'}
              </button>
            </div>
          )}

          <div className="relative pb-12">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="h-0.5 w-full bg-gray-200"></div>
            </div>
            <ul className="relative flex justify-between">
              {statuses.map((status, idx) => (
                <li key={status} className="flex flex-col items-center">
                  <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${idx <= currentStatusIdx ? 'bg-amber-600' : 'bg-gray-200'} ring-4 ring-white`}>
                    {idx < currentStatusIdx ? <CheckCircle className="h-5 w-5 text-white" /> : <Clock className={`h-4 w-4 ${idx === currentStatusIdx ? 'text-white' : 'text-gray-500'}`} />}
                  </div>
                  <span className={`absolute top-10 text-xs font-medium ${idx <= currentStatusIdx ? 'text-amber-600' : 'text-gray-500'}`}>{status}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{isDelivery ? 'Delivery Details' : 'Pickup Instructions'}</h3>
            {isDelivery ? (
              <div className="space-y-2 text-sm text-gray-600">
                <p>Delivering to: <span className="font-medium text-gray-900 capitalize">{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</span></p>
                <p>Contact phone: <span className="font-medium text-gray-900">{order.deliveryAddress.phone}</span></p>
                {Number.isFinite(order.deliveryDistanceKm) && (
                  <p>Delivery distance: <span className="font-medium text-gray-900">{order.deliveryDistanceKm.toFixed(2)} km</span></p>
                )}
                <p>Delivery fee: <span className="font-medium text-gray-900">₹{Number(order.deliveryFee || 0).toFixed(2)}</span></p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Your order will be ready at: <span className="font-medium text-gray-900">{order.artisan?.artisanData?.shopName}</span></p>
            )}
            {order.status === (isDelivery ? 'Out for Delivery' : 'Ready for Pickup') && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">{isDelivery ? 'Your order is on its way!' : 'Your items are ready!'}</h4>
                  <p className="text-sm text-green-700 mt-1">{isDelivery ? 'The artisan is delivering your order.' : 'Head to the shop to pick up your order. Mention your order number.'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <Link to="/" className="text-amber-600 hover:text-amber-700 font-medium text-sm flex items-center gap-1">
               Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracker;
