import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import waiterApi from '../api/waiterApi';
import { Button, Input, Badge } from '@/components/ui';
import { ArrowLeft, Search, Plus, Minus, Trash2, Edit3, CheckCircle, Sun, Moon, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useWaiterAuth } from '@/features/waiter/store/useWaiterAuth';
import { formatCurrency } from '@/utils/formatCurrency';

export const WaiterOrderScreen = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { waiter } = useWaiterAuth();
  const currencyCode = waiter?.restaurantCurrency || 'USD';
  
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [clickedItems, setClickedItems] = useState({});
  const [isBillingLocked, setIsBillingLocked] = useState(false);
  
  const [cart, setCart] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState('menu'); // 'menu' or 'cart'

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    fetchMenu();
    fetchActiveOrder();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await waiterApi.get('/waiter/menu');
      setCategories(res.data.data.categories);
      setMenuItems(res.data.data.items);
    } catch (error) {
      toast.error('Failed to load menu');
    }
  };

  const fetchActiveOrder = async () => {
    try {
      const res = await waiterApi.get(`/billing/${tableId}`);
      if (res.data.status === 'success' && res.data.data.order) {
        const order = res.data.data.order;
        if (order.status === 'billing') {
          setIsBillingLocked(true);
        }
        const mappedItems = (order.items || []).map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          notes: item.notes || '',
          status: item.status,
          isExisting: true
        }));
        setCart(mappedItems);
        setOrderNotes(order.notes || '');
      }
    } catch (error) {
      console.log('No active order for table or billing details load failed.');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.categoryId === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item._id);
      if (existing) {
        return prev.map(i => i.menuItemId === item._id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i);
      }
      return [...prev, {
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
        subtotal: item.price,
        notes: ''
      }];
    });
  };

  const handleItemClick = (item) => {
    addToCart(item);
    setClickedItems(prev => ({ ...prev, [item._id]: true }));
    setTimeout(() => {
      setClickedItems(prev => ({ ...prev, [item._id]: false }));
    }, 600);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.menuItemId === itemId) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ, subtotal: newQ * i.price };
      }
      return i;
    }));
  };

  const removeItem = (itemId) => {
    setCart(prev => prev.filter(i => i.menuItemId !== itemId));
  };

  const submitOrder = async (isDraft = false) => {
    if (cart.length === 0) return toast.error('Cart is empty');
    setSubmitting(true);
    try {
      await waiterApi.post('/waiter/orders', {
        tableId,
        items: cart,
        notes: orderNotes
      });
      toast.success(isDraft ? 'Order saved as draft!' : 'Order sent to kitchen!');
      navigate('/waiter/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);

  if (isBillingLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-dark-50 dark:bg-dark-900 text-dark-900 dark:text-white p-6 text-center">
        <div className="bg-white dark:bg-dark-850 p-8 rounded-2xl shadow-xl max-w-md w-full border border-dark-200 dark:border-dark-800 space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 dark:bg-amber-400/10 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-500/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold font-heading text-dark-950 dark:text-white">Table Locked</h3>
            <p className="text-sm text-dark-500 dark:text-dark-400">
              This table is in <span className="font-extrabold text-amber-600 dark:text-amber-400">Billing state</span>. You cannot add new dishes or modify this order until the bill is paid and the table status is cleared.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/waiter/dashboard')}
            className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-white font-bold border-none"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[100dvh] lg:h-[100dvh] overflow-y-auto lg:overflow-hidden bg-dark-50 dark:bg-dark-900 text-dark-900 dark:text-white">
      
      {/* Left Side: Menu Selection */}
      <div className={`flex-1 flex-col border-r border-dark-200 dark:border-dark-800 ${view === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
        <header className="p-4 border-b border-dark-200 dark:border-dark-800 flex items-center gap-4 bg-white dark:bg-dark-900">
          <button onClick={() => navigate('/waiter/dashboard')} className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
            <input 
              type="text" 
              placeholder="Search menu items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-100 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-brand-600 transition-colors text-dark-900 dark:text-white"
            />
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white transition-colors rounded-full hover:bg-dark-100 dark:hover:bg-dark-800 ml-2"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Categories */}
        <div className="overflow-x-auto whitespace-nowrap p-4 border-b border-dark-200 dark:border-dark-800 hide-scrollbar flex gap-2">
          <button 
            onClick={() => setActiveCategory('All')}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${activeCategory === 'All' ? 'bg-brand-600 text-white' : 'bg-dark-200 dark:bg-dark-800 hover:bg-dark-300 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-300'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat._id}
              onClick={() => setActiveCategory(cat._id)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${activeCategory === cat._id ? 'bg-brand-600 text-white' : 'bg-dark-200 dark:bg-dark-800 hover:bg-dark-300 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-300'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredItems.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileTap={{ scale: 0.95 }}
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`bg-white dark:bg-dark-850 shadow-sm rounded-xl p-4 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800 border transition-all flex flex-col justify-between select-none relative ${clickedItems[item._id] ? 'border-emerald-500 dark:border-emerald-450 ring-2 ring-emerald-500/20 dark:ring-emerald-450/20' : 'border-dark-200 dark:border-dark-700 hover:border-brand-600'}`}
                >
                  <AnimatePresence>
                    {clickedItems[item._id] && (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: -20, scale: 1 }}
                        exit={{ opacity: 0, y: -45, scale: 0.8 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute right-3 top-3 bg-emerald-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md z-20 pointer-events-none uppercase tracking-wider"
                      >
                        +1 Added
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <div>
                    {item.image && (
                      <div className="h-28 w-full overflow-hidden rounded-lg mb-2.5 bg-dark-100 dark:bg-dark-800">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h4 className="font-semibold text-base sm:text-lg line-clamp-2 text-dark-900 dark:text-white">{item.name}</h4>
                    <p className="text-dark-500 dark:text-dark-400 text-xs sm:text-sm mt-1 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="mt-4 font-bold text-brand-600">
                    {formatCurrency(item.price, currencyCode)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile/Tablet Sticky Bottom Cart Toggle Bar */}
        {cart.length > 0 && (
          <div className="lg:hidden p-4 bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800 safe-bottom">
            <button
              onClick={() => setView('cart')}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="bg-brand-700 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
                <span>View Order</span>
              </div>
              <span className="font-bold">{formatCurrency(grandTotal, currencyCode)}</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Side: Current Order / Cart */}
      <div className={`w-full lg:w-[400px] h-auto lg:h-full flex-col bg-white dark:bg-dark-900 border-l border-dark-200 dark:border-dark-800 ${view === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
        <header className="p-6 border-b border-dark-200 dark:border-dark-800 bg-dark-50 dark:bg-dark-850/50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold font-heading text-dark-900 dark:text-white">Current Order</h2>
            {/* Mobile/Tablet Back to Menu Button */}
            <button
              onClick={() => setView('menu')}
              className="lg:hidden text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
            >
              + Add Items
            </button>
          </div>
          <p className="text-dark-500">Table {tableId.slice(-4)}</p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="text-center text-dark-400 mt-10">
                <p>No items added yet.</p>
                <p className="text-sm">Click on menu items to add them.</p>
                {/* Mobile/Tablet back to menu button when cart empty */}
                <button
                  onClick={() => setView('menu')}
                  className="lg:hidden mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium cursor-pointer"
                >
                  Go to Menu
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={item.menuItemId} 
                  className="bg-dark-50 dark:bg-dark-850 rounded-xl p-4 border border-dark-200 dark:border-dark-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold pr-2 text-dark-900 dark:text-white">{item.name}</h5>
                    <span className="font-bold whitespace-nowrap text-dark-900 dark:text-white">{formatCurrency(item.subtotal, currencyCode)}</span>
                  </div>
                  {['preparing', 'ready', 'served'].includes(item.status) ? (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">
                        Quantity: <span className="font-bold text-dark-800 dark:text-white">{item.quantity}</span>
                      </span>
                      <Badge variant={item.status === 'preparing' ? 'warning' : 'success'} className="capitalize font-bold text-[10px] py-0.5 px-2">
                        {item.status}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.menuItemId, -1)} className="p-1 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-md">
                          <Minus className="w-4 h-4 text-dark-600 dark:text-dark-400" />
                        </button>
                        <span className="font-medium w-4 text-center text-dark-900 dark:text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.menuItemId, 1)} className="p-1 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-md text-brand-600">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-dark-400 hover:text-dark-700 dark:hover:text-white rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeItem(item.menuItemId)} className="p-2 text-dark-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Order Summary & Actions */}
        <div className="p-6 bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800">
          <Input 
            placeholder="Add general order notes..."
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="mb-4 bg-dark-50 dark:bg-dark-850 border-dark-200 dark:border-dark-700"
          />
          <div className="flex justify-between items-center mb-6 text-xl">
            <span className="font-medium text-dark-500">Grand Total</span>
            <span className="font-bold text-dark-900 dark:text-white">{formatCurrency(grandTotal, currencyCode)}</span>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-dark-300 dark:border-dark-700 text-dark-600 dark:text-dark-300"
              onClick={() => submitOrder(true)}
              disabled={submitting || cart.length === 0}
            >
              Save Draft
            </Button>
            <Button 
              variant="primary"
              className="flex-1"
              onClick={() => submitOrder(false)}
              disabled={submitting || cart.length === 0}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Send to Kitchen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
