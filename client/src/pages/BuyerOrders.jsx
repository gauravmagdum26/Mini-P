import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { AuthContext } from '../context/AuthContext';
import { Package, Clock, CheckCircle } from 'lucide-react';

const BuyerOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const cancelOrder = async (order) => {
    if (!window.confirm('Cancel this pending Cash on Delivery order? Payment is collected on delivery, so no payment has been collected yet.')) return;
    try {
      const { data } = await api.put(`/orders/${order._id}/cancel`);
      setOrders(current => current.map(item => item._id === order._id ? data.data : item));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel the order.');
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/myorders');
        // Keep delivered orders visible so buyers can review their completed delivery.
        setOrders(data.data.filter(order => order.status !== 'Completed'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user, navigate]);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          title="Go Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      </div>

      <div className="bg-white shadow-sm overflow-hidden sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {orders.map(order => (
            <li key={order._id}>
              <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50">
                <Link to={`/order/${order._id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-600 truncate">
                        Order #{order._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.products.map(p => `${p.product?.name || 'Deleted Product'} (x${p.quantity || 1})`).join(', ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        From: {order.artisan?.artisanData?.shopName || 'Unknown Shop'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {order.fulfillmentMethod === 'Delivery' ? 'Delivery' : 'Self-Pickup'}
                      </p>
                      {order.fulfillmentMethod === 'Delivery' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Number.isFinite(order.deliveryDistanceKm) ? `${order.deliveryDistanceKm.toFixed(2)} km · ` : ''}
                          Delivery fee ₹{Number(order.deliveryFee || 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                </Link>
                  
                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <p className="text-sm font-bold text-gray-900">₹{order.totalAmount}</p>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center
                      ${order.status === 'Cancelled' ? 'bg-red-100 text-red-800' : order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        ['Ready for Pickup', 'Out for Delivery', 'Delivered'].includes(order.status) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {['Completed', 'Delivered', 'Cancelled'].includes(order.status) ? <CheckCircle className="h-3 w-3 inline mr-1" /> : <Clock className="h-3 w-3 inline mr-1" />}
                      {order.status}
                    </span>
                    </div>
                    {order.status === 'Pending' && order.paymentMethod === 'Cash' && order.fulfillmentMethod === 'Delivery' && (
                      <button
                        type="button"
                        onClick={() => cancelOrder(order)}
                        className="text-sm font-medium text-red-700 hover:text-red-800 sm:text-right"
                      >
                        Cancel order
                      </button>
                    )}
                  </div>
                </div>
            </li>
          ))}
          {orders.length === 0 && (
            <li className="px-4 py-12 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>You haven't placed any orders yet.</p>
              <Link to="/" className="mt-4 inline-block text-amber-600 font-medium hover:text-amber-700">Start Shopping</Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default BuyerOrders;
