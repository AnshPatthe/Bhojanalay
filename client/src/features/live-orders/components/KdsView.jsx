import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Select, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import api from '@/api';
import {
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Users,
  Utensils,
  ChevronDown,
  Volume2,
  VolumeX,
  FileText
} from 'lucide-react';

export const KdsView = ({ socket }) => {
  const { currentRestaurant } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'preparing', 'ready', 'delayed'
  const [stationFilter, setStationFilter] = useState('All');

  // Live timer ticks
  const [timeTick, setTimeTick] = useState(Date.now());

  // History Popup Contexts
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyContext, setHistoryContext] = useState(null); // 'cancel' or 'modification'
  const [historyOrder, setHistoryOrder] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTimeTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchOrders();

    if (socket) {
      const handleNewOrder = (newOrder) => {
        if (!newOrder) return;
        const displayId = newOrder._id ? newOrder._id.substring(newOrder._id.length - 6).toUpperCase() : '';
        
        // Notify
        toast(`New order ticket #${displayId} placed for ${newOrder.tableNumber}!`, {
          icon: '🛎️',
          duration: 5000
        });

        if (soundEnabled) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
            audio.play();
          } catch (e) {
            console.log('Audio playback blocked');
          }
        }
        
        fetchOrders();
      };

      const handleStatusUpdated = () => {
        fetchOrders();
      };

      socket.on('new_order', handleNewOrder);
      socket.on('order_status_updated', handleStatusUpdated);
      socket.on('tables_updated', () => fetchOrders());

      return () => {
        socket.off('new_order', handleNewOrder);
        socket.off('order_status_updated', handleStatusUpdated);
      };
    }
  }, [socket, soundEnabled]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.data);
    } catch (err) {
      toast.error('Failed to load orders feed');
    } finally {
      setLoading(false);
    }
  };

  // Kitchen operations
  const handleStartPreparing = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'preparing' });
      toast.success('Preparation started! 🍳');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleUpdateItemStatus = async (itemId, nextStatus) => {
    try {
      await api.patch(`/orders/items/${itemId}/status`, { status: nextStatus });
      toast.success(`Item marked as ${nextStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item status');
    }
  };

  const handleMarkEntireReady = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'ready' });
      toast.success('Order is Ready to Serve! 🍽️');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete order');
    }
  };

  const handleRecallOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/recall`);
      toast.success('Order recalled back to kitchen preparation');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recall order');
    }
  };

  // Performance analytics math
  const todayOrders = orders.filter(o => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return new Date(o.createdAt).toISOString().slice(0, 10) === todayStr;
  });

  const completedToday = todayOrders.filter(o => o.status === 'completed');
  const readyToday = todayOrders.filter(o => o.status === 'ready');
  const finishedToday = [...completedToday, ...readyToday];

  const avgPrepTime = finishedToday.length > 0
    ? Math.round(
        finishedToday.reduce((sum, o) => {
          const start = new Date(o.preparingAt || o.createdAt).getTime();
          const end = new Date(o.readyAt || o.updatedAt).getTime();
          return sum + (end - start) / (1000 * 60);
        }, 0) / finishedToday.length
      )
    : 12; // default mock fallback

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  const isDelayed = (order) => {
    if (order.status !== 'preparing') return false;
    const elapsed = (timeTick - new Date(order.preparingAt || order.createdAt).getTime()) / (1000 * 60);
    return elapsed > 15; // delayed if preparation takes > 15 minutes
  };

  const delayedCount = orders.filter(isDelayed).length;

  // Filter and search computation
  const filteredTickets = orders.filter(o => {
    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const tableMatch = (o.tableNumber || '').toLowerCase().includes(q);
      const waiterMatch = (o.waiterId?.name || '').toLowerCase().includes(q);
      const idMatch = o._id.toLowerCase().includes(q);
      if (!tableMatch && !waiterMatch && !idMatch) return false;
    }

    // 2. Status Filter
    if (statusFilter === 'pending' && o.status !== 'pending') return false;
    if (statusFilter === 'preparing' && o.status !== 'preparing') return false;
    if (statusFilter === 'ready' && o.status !== 'ready') return false;
    if (statusFilter === 'delayed' && !isDelayed(o)) return false;
    if (statusFilter === 'all' && !['pending', 'preparing', 'ready'].includes(o.status)) return false;

    // 3. Station Filter
    if (stationFilter !== 'All') {
      const hasStationItem = o.items.some(i => i.station === stationFilter);
      if (!hasStationItem) return false;
    }

    return true;
  });

  const getTimerMinutes = (time) => {
    if (!time) return '0m';
    const elapsed = Math.floor((timeTick - new Date(time).getTime()) / (1000 * 60));
    return `${elapsed}m`;
  };

  const openHistory = (order, type) => {
    setHistoryOrder(order);
    setHistoryContext(type);
    setHistoryModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="border-brand-600" />
      </div>
    );
  }

  const stations = ['All', 'Main Course', 'Tandoor', 'Chinese', 'Snacks', 'Beverages', 'Desserts', 'General'];

  return (
    <div className="space-y-6 text-left">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-dark-900 dark:text-white mb-1">
            Kitchen Display System (KDS)
          </h1>
          <p className="text-xs text-dark-500">Live order tickets and item-level status workflows</p>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-dark-800 text-dark-400 border-dark-700'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          Sound Alerts: {soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Tickets', val: pendingCount, color: 'text-dark-400', bg: 'bg-dark-500/5' },
          { label: 'Preparing Now', val: preparingCount, color: 'text-amber-500', bg: 'bg-amber-500/5' },
          { label: 'Ready for Service', val: readyCount, color: 'text-emerald-500', bg: 'bg-emerald-500/5' }
        ].map((card, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border border-dark-200 dark:border-dark-800 ${card.bg} shadow-sm`}>
            <p className="text-xs text-dark-400 font-medium">{card.label}</p>
            <p className={`text-xl sm:text-2xl font-bold font-heading mt-1.5 ${card.color}`}>{card.val}</p>
          </div>
        ))}
      </div>

      {/* Filters and Searches */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-dark-850 p-4 rounded-2xl border border-dark-200 dark:border-dark-800 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Table, Waiter, Order ID..."
            className="w-full pl-10 pr-4 py-2 bg-dark-50 dark:bg-dark-800 border border-dark-250 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="p-2 bg-dark-50 dark:bg-dark-800 border border-dark-250 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
        >
          <option value="all">Active Status (All)</option>
          <option value="pending">Pending Queue</option>
          <option value="preparing">Preparing Queue</option>
          <option value="ready">Ready Queue</option>
          <option value="delayed">Delayed Queue</option>
        </select>

        <select
          value={stationFilter}
          onChange={e => setStationFilter(e.target.value)}
          className="p-2 bg-dark-50 dark:bg-dark-800 border border-dark-250 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
        >
          {stations.map(st => (
            <option key={st} value={st}>{st} Station</option>
          ))}
        </select>

        <button onClick={fetchOrders} className="py-2 bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-dark-800 dark:text-dark-200 text-sm font-bold rounded-xl border border-dark-200 dark:border-dark-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
          <RotateCcw className="w-4 h-4" />
          Refresh Feed
        </button>
      </div>

      {/* Live Tickets View */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 p-12 rounded-3xl text-center text-dark-400">
          No live order tickets match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTickets.map(order => {
            const displayId = order._id.substring(order._id.length - 6).toUpperCase();
            const delayed = isDelayed(order);
            
            // Priority Tag coloring
            const prioColor = 
              order.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
              order.priority === 'VIP' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
              order.priority === 'High' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
              'bg-dark-500/10 text-dark-400 border border-dark-500/20';

            return (
              <div
                key={order._id}
                className={`bg-white dark:bg-dark-850 border rounded-3xl p-5 shadow-xl flex flex-col justify-between gap-4 relative transition-all duration-150 ${
                  delayed 
                    ? 'border-red-500/50 shadow-red-500/5 bg-red-500/[0.01]' 
                    : 'border-dark-200 dark:border-dark-800'
                }`}
              >
                {/* Delayed tag warning banner */}
                {delayed && (
                  <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] uppercase font-bold py-1 px-4 text-center tracking-widest flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Delayed Prep (&gt;15 mins)
                  </div>
                )}

                <div className={`flex justify-between items-start ${delayed ? 'pt-4' : 'pt-1'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white">
                        {order.tableNumber.toLowerCase().startsWith('table') ? order.tableNumber : `Table ${order.tableNumber}`}
                      </h4>
                      <Badge className={prioColor}>{order.priority || 'Normal'}</Badge>
                    </div>
                    <span className="text-[10px] text-dark-450 font-mono block">Ticket: #{displayId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-dark-100 dark:bg-dark-800 text-dark-400 px-2 py-0.5 rounded font-bold font-mono">
                      {order.status === 'preparing' ? getTimerMinutes(order.preparingAt) : getTimerMinutes(order.createdAt)}
                    </span>
                    <span className="text-[9px] text-dark-450 block mt-1">Prep Timer</span>
                  </div>
                </div>

                {/* Staff details */}
                <div className="text-xs text-dark-550 border-t border-dark-100 dark:border-dark-800 pt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Waiter: <strong className="text-dark-800 dark:text-dark-200">{order.waiterId?.name || 'N/A'}</strong></span>
                  {order.customerId && (
                    <span>Customer: <strong className="text-dark-800 dark:text-dark-200">{order.customerId?.name || 'Guest'}</strong></span>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-3.5 my-1 flex-1">
                  {order.items
                    .filter(i => stationFilter === 'All' || i.station === stationFilter)
                    .map((item, idx) => {
                      const itemCancelled = item.status === 'cancelled';
                      return (
                        <div
                          key={item._id || idx}
                          className={`p-3 rounded-2xl border text-sm flex justify-between items-start gap-4 transition-all ${
                            item.status === 'ready'
                              ? 'bg-emerald-500/[0.03] border-emerald-500/20 text-emerald-400/90'
                              : item.status === 'preparing'
                              ? 'bg-amber-500/[0.03] border-amber-500/20 text-amber-400/90'
                              : itemCancelled
                              ? 'bg-rose-500/[0.02] border-rose-500/10 text-dark-500 line-through'
                              : 'bg-dark-50 dark:bg-dark-800 border-dark-200 dark:border-dark-750'
                          }`}
                        >
                          <div className="flex-1">
                            <span className="font-bold text-dark-900 dark:text-white">
                              {item.quantity}x {item.name}
                            </span>
                            {item.notes && (
                              <p className="text-[11px] text-brand-400 font-semibold italic mt-0.5">"{item.notes}"</p>
                            )}
                            {item.cancellationReason && (
                              <p className="text-[11px] text-rose-400 italic mt-0.5">Reason: "{item.cancellationReason}"</p>
                            )}
                          </div>
                          
                          {/* Item status toggle controls */}
                          {!itemCancelled && (
                            <div className="flex gap-1.5 flex-shrink-0">
                              {item.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateItemStatus(item._id, 'preparing')}
                                  className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                                  title="Start preparing item"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {['pending', 'preparing'].includes(item.status) && (
                                <button
                                  onClick={() => handleUpdateItemStatus(item._id, 'ready')}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                                  title="Mark item ready"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {item.status === 'ready' && (
                                <button
                                  onClick={() => handleUpdateItemStatus(item._id, 'preparing')}
                                  className="p-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg transition-colors cursor-pointer"
                                  title="Recall back to cooking"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Cancel / Mod logs link */}
                <div className="flex justify-between items-center text-[10px] text-brand-450">
                  <button onClick={() => openHistory(order, 'cancel')} className="hover:underline flex items-center gap-1 cursor-pointer">
                    <FileText className="w-3 h-3" />
                    Cancellations History
                  </button>
                </div>

                {/* Ticket Action Footer */}
                <div className="border-t border-dark-100 dark:border-dark-800 pt-3">
                  {order.status === 'pending' ? (
                    <Button
                      variant="primary"
                      onClick={() => handleStartPreparing(order._id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 font-heading"
                    >
                      <Play className="w-4 h-4" />
                      Start Cooking Entire
                    </Button>
                  ) : order.status === 'preparing' ? (
                    <Button
                      variant="success"
                      onClick={() => handleMarkEntireReady(order._id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heading"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Entire Ready
                    </Button>
                  ) : (
                    <button
                      onClick={() => handleRecallOrder(order._id)}
                      className="w-full py-2.5 bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-dark-800 dark:text-dark-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-dark-200 dark:border-dark-800"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Recall Ticket to Cooking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History Dialog Popup */}
      {historyModalOpen && historyOrder && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white mb-4">
              Cancellations Log (Table {historyOrder.tableNumber})
            </h4>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {historyOrder.cancellationReason && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <p className="text-xs font-bold text-rose-400">Order Cancellation</p>
                  <p className="text-sm mt-1 text-dark-200">"{historyOrder.cancellationReason}"</p>
                </div>
              )}
              {historyOrder.items.filter(i => i.status === 'cancelled').map((item, idx) => (
                <div key={idx} className="p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 rounded-xl text-left">
                  <p className="text-xs font-bold text-dark-950 dark:text-white">{item.quantity}x {item.name}</p>
                  <p className="text-xs text-rose-400 mt-1 italic">Reason: "{item.cancellationReason || 'N/A'}"</p>
                </div>
              ))}
              {(!historyOrder.cancellationReason && historyOrder.items.filter(i => i.status === 'cancelled').length === 0) && (
                <p className="text-sm text-dark-400 text-center py-4">No cancellations for this ticket.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KdsView;
