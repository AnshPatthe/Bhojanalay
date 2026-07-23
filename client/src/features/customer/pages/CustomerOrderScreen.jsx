import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Utensils,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  X
} from 'lucide-react';
import { Card, CardContent, Button, Input, Spinner, Drawer } from '@/components/ui';
import { formatCurrency } from '@/utils/formatCurrency';

export const CustomerOrderScreen = () => {
  const { tableId } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { table, restaurant, categories, items }
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Placed Order State
  const [placedOrder, setPlacedOrder] = useState(null);

  const fetchTableContext = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/customer/table/${tableId}`);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load table ordering menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tableId) {
      fetchTableContext();
    }
  }, [tableId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex flex-col justify-center items-center p-4">
        <Spinner size="lg" className="mb-4" />
        <p className="text-sm font-medium text-dark-300 animate-pulse">Loading Table Menu...</p>
      </div>
    );
  }

  if (!data || !data.table) {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex flex-col justify-center items-center p-6 text-center">
        <Utensils className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold mb-2">Invalid Table QR Code</h2>
        <p className="text-sm text-dark-400 max-w-xs mb-6">
          The scanned QR code is invalid or has expired. Please request assistance from restaurant staff.
        </p>
      </div>
    );
  }

  const { table, restaurant, categories, items } = data;
  const currencyCode = restaurant?.currency || 'USD';

  // Cart Helpers
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item._id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
            : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
          subtotal: item.price,
          image: item.image
        }
      ];
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0
              ? { ...i, quantity: newQty, subtotal: newQty * i.price }
              : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        tableId: table._id,
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        })),
        customerName: customerName.trim() || undefined,
        notes: orderNotes.trim() || undefined
      };

      const res = await axios.post('/api/v1/customer/order', payload);
      setPlacedOrder(res.data.data);
      setCart([]);
      setIsCartOpen(false);
      toast.success('Order sent to kitchen!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCategory === 'all'
        ? true
        : (item.categoryId?._id || item.categoryId) === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-dark-950 text-white pb-28 text-left font-sans">
      {/* Header Banner */}
      <div className="sticky top-0 z-30 bg-dark-900/90 backdrop-blur-md border-b border-dark-800 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white font-heading leading-tight">
                {restaurant?.name || 'Vyavastha Dining'}
              </h1>
              <p className="text-2xs text-dark-400">Scan & Self-Order System</p>
            </div>
          </div>

          {/* Table Badge */}
          <div className="bg-brand-500/10 border border-brand-500/30 px-3 py-1 rounded-xl text-right">
            <span className="text-2xs font-semibold text-brand-400 uppercase tracking-wider block">
              {table.floor}
            </span>
            <span className="text-sm font-extrabold text-white">
              Table {table.tableNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {placedOrder ? (
        /* Placed Order Confirmation View */
        <div className="p-6 max-w-md mx-auto text-center space-y-6 animate-fade-in mt-4">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold font-heading text-white">Order Received!</h2>
            <p className="text-xs text-dark-400 mt-1">
              Order <span className="font-mono text-brand-400 font-bold">#{placedOrder.displayId || placedOrder.orderNumber}</span> sent to the kitchen.
            </p>
          </div>

          <Card className="bg-dark-900 border-dark-800 text-left p-4">
            <CardContent className="p-0 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-dark-800">
                <span className="text-dark-400">Table:</span>
                <span className="font-bold text-white">Table {table.tableNumber} ({table.floor})</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-dark-800">
                <span className="text-dark-400">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                  {placedOrder.status || 'Pending'}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-dark-300">Items Ordered:</p>
                {placedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-dark-300">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.subtotal || item.price * item.quantity, currencyCode)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-dark-800 flex justify-between items-center text-sm font-bold text-white">
                <span>Total Amount:</span>
                <span className="text-brand-400">{formatCurrency(placedOrder.totalAmount, currencyCode)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="secondary"
            className="w-full text-xs font-semibold"
            onClick={() => setPlacedOrder(null)}
          >
            Order More Dishes
          </Button>
        </div>
      ) : (
        /* Menu Catalog View */
        <div className="p-4 max-w-xl mx-auto space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <Input
              placeholder="Search dishes or drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-dark-900 border-dark-800 text-xs text-white placeholder:text-dark-500 focus:border-brand-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-brand-600 text-white font-bold shadow-sm'
                  : 'bg-dark-900 border border-dark-800 text-dark-400 hover:text-white'
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat._id
                    ? 'bg-brand-600 text-white font-bold shadow-sm'
                    : 'bg-dark-900 border border-dark-800 text-dark-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items List / Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-dark-500 text-xs">
              No dishes found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const inCart = cart.find((i) => i.menuItemId === item._id);
                return (
                  <Card key={item._id} className="bg-dark-900 border-dark-800 overflow-hidden flex flex-col justify-between">
                    <div className="p-3 flex gap-3">
                      {item.image ? (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-dark-800 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-dark-800 flex items-center justify-center text-dark-600 flex-shrink-0">
                          <Utensils className="w-6 h-6 opacity-40" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                        <p className="text-2xs text-dark-400 line-clamp-2 mt-0.5">{item.description || 'Tasty freshly prepared dish.'}</p>
                        <p className="text-xs font-extrabold text-brand-400 mt-2">
                          {formatCurrency(item.price, currencyCode)}
                        </p>
                      </div>
                    </div>

                    <div className="px-3 pb-3 pt-0 flex justify-end">
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-brand-600/20 border border-brand-500/30 rounded-lg px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="p-1 text-brand-400 hover:bg-brand-500/30 rounded cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-white min-w-[16px] text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="p-1 text-brand-400 hover:bg-brand-500/30 rounded cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => addToCart(item)}
                          className="h-7 px-3 text-xs bg-dark-800 border-dark-700 text-white hover:bg-brand-600 hover:border-brand-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && !placedOrder && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer transition-transform active:scale-98 border border-brand-400/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-extrabold text-sm">
                {cartItemCount}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">View Order Cart</p>
                <p className="text-2xs text-brand-100">{cartItemCount} dish{cartItemCount > 1 ? 'es' : ''} selected</p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-bold text-sm">
              <span>{formatCurrency(cartTotal, currencyCode)}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      <Drawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} title={`Table ${table.tableNumber} Order Cart`}>
        <div className="space-y-4 text-left">
          {/* Cart Items List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-dark-800 text-xs">
                <div className="flex-1 pr-2">
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-2xs text-dark-400">{formatCurrency(item.price, currencyCode)} each</p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.menuItemId, -1)} className="p-1 rounded bg-dark-800 text-dark-300 hover:text-white">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-white min-w-[14px] text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menuItemId, 1)} className="p-1 rounded bg-dark-800 text-dark-300 hover:text-white">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="font-extrabold text-brand-400 ml-3">{formatCurrency(item.subtotal, currencyCode)}</span>
              </div>
            ))}
          </div>

          {/* Special Instructions & Customer Name */}
          <div className="space-y-3 pt-2 border-t border-dark-800">
            <div>
              <label className="text-2xs font-semibold text-dark-400 block mb-1">Your Name (Optional)</label>
              <Input
                placeholder="e.g. Alex"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-dark-900 border-dark-800 text-xs"
              />
            </div>

            <div>
              <label className="text-2xs font-semibold text-dark-400 block mb-1">Special Cooking Notes (Optional)</label>
              <Input
                placeholder="e.g. Less spicy, no onions"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="bg-dark-900 border-dark-800 text-xs"
              />
            </div>
          </div>

          {/* Subtotal & Confirm Button */}
          <div className="pt-3 border-t border-dark-800 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-dark-300">Total Bill Amount:</span>
              <span className="text-base text-brand-400">{formatCurrency(cartTotal, currencyCode)}</span>
            </div>

            <Button
              variant="primary"
              className="w-full py-3 text-xs font-bold"
              onClick={handlePlaceOrder}
              disabled={submitting}
            >
              {submitting ? 'Placing Order...' : 'Confirm & Place Order to Kitchen'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default CustomerOrderScreen;
