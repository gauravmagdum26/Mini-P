import { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { cart, itemCount, subtotal, removeItem, setItemQuantity } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'buyer')) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user || user.role !== 'buyer') {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" /></div>;
  }

  const hasInvalidStock = cart.items.some(item => item.stockQuantity < 1 || item.quantity > item.stockQuantity);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-amber-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <p className="text-sm font-medium text-amber-700">{cart.artisanName || 'Your shop'}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Your Cart</h1>
        </div>
        <span className="text-sm text-gray-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      </div>

      {cart.items.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-600">Your cart is empty.</p>
          <Link to="/" className="mt-5 inline-flex rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {cart.items.map(item => (
              <li key={item.productId} className="flex gap-4 py-5">
                <img src={item.imageUrl || 'https://via.placeholder.com/160'} alt={item.name} className="h-24 w-24 rounded-md object-cover bg-gray-100" />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${item.productId}`} className="font-medium text-gray-900 hover:text-amber-700">{item.name}</Link>
                  <p className="mt-1 text-sm text-gray-600">₹{item.price}</p>
                  <p className={`mt-1 text-xs ${item.stockQuantity > 0 ? 'text-gray-500' : 'text-red-700'}`}>
                    {item.stockQuantity > 0 ? `${item.stockQuantity} available` : 'Sold out'}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => setItemQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1} className="rounded border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-7 text-center text-sm font-medium text-gray-900">{item.quantity}</span>
                    <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => setItemQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= Math.min(10, item.stockQuantity)} className="rounded border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => removeItem(item.productId)} className="ml-3 inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">₹{item.price * item.quantity}</p>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            <div className="mt-4 flex justify-between text-sm text-gray-600">
              <span>Items ({itemCount})</span>
              <span>₹{subtotal}</span>
            </div>
            <p className="mt-3 text-xs text-gray-500">Delivery or pickup and payment are chosen at checkout.</p>
            {hasInvalidStock && <p className="mt-3 text-sm text-red-700">Remove sold-out items or update quantities before checkout.</p>}
            <button type="button" disabled={hasInvalidStock} onClick={() => navigate('/checkout')} className="mt-5 w-full rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-400">
              Continue to Checkout
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
