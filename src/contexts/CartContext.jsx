import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const GUEST_KEY = 'cart_guest';
const cartKeyFor = (user) => (user ? `cart_${user.id}` : GUEST_KEY);

function readCart(key) {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeCarts(base, extra) {
  const merged = base.map((item) => ({ ...item }));
  extra.forEach((item) => {
    const existing = merged.find((i) => i.id === item.id);
    if (existing) existing.quantity += item.quantity;
    else merged.push({ ...item });
  });
  return merged;
}

export function CartProvider({ children }) {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Chaque utilisateur (et chaque visiteur) a son propre panier :
  // { key: clé de stockage du propriétaire, items: articles }
  const [cart, setCart] = useState({ key: null, items: [] });
  const [isOpen, setIsOpen] = useState(false);
  const items = cart.items;

  const setItems = (updater) =>
    setCart((prev) => ({
      ...prev,
      items: typeof updater === 'function' ? updater(prev.items) : updater,
    }));

  // Charge le panier du propriétaire courant dès que l'authentification est connue
  useEffect(() => {
    if (loading) return;
    localStorage.removeItem('cart'); // ancien panier commun à tous les comptes
    const key = cartKeyFor(user);
    setCart((prev) => {
      if (prev.key === key) return prev;
      // Un visiteur qui se connecte garde les articles qu'il avait ajoutés
      const carryOver = prev.key === null || prev.key === GUEST_KEY ? prev.items : [];
      return { key, items: mergeCarts(readCart(key), carryOver) };
    });
  }, [user, loading]);

  // Le panier du visiteur est supprimé une fois rattaché à un compte
  useEffect(() => {
    if (cart.key && cart.key !== GUEST_KEY) localStorage.removeItem(GUEST_KEY);
  }, [cart.key]);

  useEffect(() => {
    if (!cart.key) return;
    localStorage.setItem(cart.key, JSON.stringify(cart.items));
  }, [cart]);

  const addItem = (product, quantity = 1) => {
    if (isAdmin) return; // un administrateur ne passe pas de commande
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    setIsOpen(true);
  };

  const removeItem = (productId) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemPrice = (item) => {
    return item.prix_promo || item.prix;
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      totalItems, totalPrice, isOpen, setIsOpen, getItemPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}