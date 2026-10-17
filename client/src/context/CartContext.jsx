import { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';

export const CartContext = createContext(null);

const emptyCart = () => ({ artisanId: null, artisanName: '', artisan: null, items: [] });

const getBuyerId = (user) => user?.role === 'buyer' ? (user._id || user.id) : null;

const readCart = (storageKey) => {
  if (!storageKey || typeof window === 'undefined') return emptyCart();
  try {
    const storedCart = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    return storedCart && Array.isArray(storedCart.items) ? storedCart : emptyCart();
  } catch {
    return emptyCart();
  }
};

export const CartProvider = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const buyerId = getBuyerId(user);
  const storageKey = buyerId ? `artisan-local-cart:${buyerId}` : null;
  const [cartState, setCartState] = useState({ storageKey: null, cart: emptyCart() });
  const cart = !storageKey
    ? emptyCart()
    : cartState.storageKey === storageKey
      ? cartState.cart
      : readCart(storageKey);

  useEffect(() => {
    if (loading || !storageKey || cartState.storageKey !== storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(cartState.cart));
  }, [cartState, loading, storageKey]);

  const updateCart = (nextCart) => {
    if (!storageKey) return;
    setCartState(current => {
      const currentCart = current.storageKey === storageKey ? current.cart : readCart(storageKey);
      return {
        storageKey,
        cart: typeof nextCart === 'function' ? nextCart(currentCart) : nextCart,
      };
    });
  };

  const addProduct = (product) => {
    const artisan = product.artisanDetails || product.artisan;
    const artisanId = artisan?._id;
    const stockQuantity = Number.isInteger(product.stockQuantity) ? product.stockQuantity : 0;
    if (!buyerId || !artisanId || stockQuantity < 1) return { added: false, replaced: false };

    const replaced = Boolean(cart.artisanId && cart.artisanId !== artisanId);
    const baseCart = replaced ? emptyCart() : cart;
    const existingItem = baseCart.items.find(item => item.productId === product._id);
    const maxQuantity = Math.min(10, stockQuantity);
    if (existingItem && existingItem.quantity >= maxQuantity) {
      return { added: false, replaced: false, atLimit: true };
    }

    const item = {
      productId: product._id,
      name: product.name,
      price: product.price,
      imageUrl: product.images?.[0]?.url || '',
      stockQuantity,
      quantity: Math.min((existingItem?.quantity || 0) + 1, maxQuantity),
    };
    const items = existingItem
      ? baseCart.items.map(current => current.productId === item.productId ? item : current)
      : [...baseCart.items, item];

    updateCart({
      artisanId,
      artisanName: artisan.artisanData?.shopName || artisan.name || 'Artisan shop',
      artisan: {
        _id: artisanId,
        name: artisan.name,
        artisanData: artisan.artisanData || {},
        location: artisan.location,
      },
      items,
    });
    return { added: true, replaced };
  };

  const removeItem = (productId) => {
    updateCart(current => {
      const items = current.items.filter(item => item.productId !== productId);
      return items.length ? { ...current, items } : emptyCart();
    });
  };

  const setItemQuantity = (productId, quantity) => {
    updateCart(current => ({
      ...current,
      items: current.items.map(item => {
        if (item.productId !== productId) return item;
        const maximum = Math.min(10, item.stockQuantity);
        return { ...item, quantity: Math.min(Math.max(quantity, 1), maximum) };
      }),
    }));
  };

  const clearCart = () => updateCart(emptyCart());
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, itemCount, subtotal, addProduct, removeItem, setItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
};
