import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Drawer, Input, Select, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import api from '@/api';

export const OrdersManager = ({ socket }) => {
  const { currentRestaurant } = useAuthStore();
  const currencyCode = currentRestaurant?.currency || 'USD';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'
  const [selectedOrderForPopup, setSelectedOrderForPopup] = useState(null);
  
  // Completed/Cancelled Order filters state
  const [completedSearch, setCompletedSearch] = useState('');
  const [completedStatusFilter, setCompletedStatusFilter] = useState('all');
  const [completedOrderTypeFilter, setCompletedOrderTypeFilter] = useState('all');
  const [isNewOrderDrawerOpen, setIsNewOrderDrawerOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [isAddTableDrawerOpen, setIsAddTableDrawerOpen] = useState(false);
  const [newTableForm, setNewTableForm] = useState({ tableNumber: '', capacity: 4 });

  // New Order Form state
  const [newOrderForm, setNewOrderForm] = useState({
    tableNumber: '',
    orderType: 'dine-in',
    customerPhone: '',
    customerName: '',
    items: []
  });

  // Billing and Invoice state
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  const [processingPayment, setProcessingPayment] = useState(false);

  const handlePrint = (invoice) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; text-align: left; }
            .header-info { font-size: 14px; margin-bottom: 10px; }
            .footer { margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="text-center">
            <h2>${invoice.restaurantName}</h2>
            <div class="header-info">
              ${invoice.restaurantAddress || 'Main Branch'}<br/>
              Phone: ${invoice.restaurantPhone || 'N/A'}<br/>
              GSTIN: ${invoice.gstNumber || 'N/A'}
            </div>
          </div>
          <div class="divider"></div>
          <div class="header-info">
            <strong>Invoice:</strong> ${invoice.invoiceNumber}<br/>
            <strong>Table:</strong> Table ${invoice.tableNumber}<br/>
            <strong>Waiter:</strong> ${invoice.waiterName || 'N/A'}<br/>
            <strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}<br/>
            <strong>Time:</strong> ${new Date(invoice.createdAt).toLocaleTimeString()}<br/>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.price, currencyCode)}</td>
                  <td class="text-right">${formatCurrency(item.subtotal, currencyCode)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="text-right">
            <p>Subtotal: ${formatCurrency(invoice.subtotal, currencyCode)}</p>
            <p>GST (${invoice.gstPercentage}%): ${formatCurrency(invoice.gstAmount, currencyCode)}</p>
            <h3 class="bold">Grand Total: ${formatCurrency(invoice.grandTotal, currencyCode)}</h3>
          </div>
          <div class="divider"></div>
          <div class="text-center footer">
            Thank you for dining with us!<br/>
            Vyavastha Billing System
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePayBillClick = async (order) => {
    try {
      const res = await api.post('/billing/generate', { 
        orderId: order._id || order.id, 
        tableId: order.tableId 
      });
      if (res.data.status === 'success') {
        const billId = res.data.data._id;
        const invoiceRes = await api.get(`/billing/invoice/${billId}`);
        if (invoiceRes.data.status === 'success') {
          setInvoiceDetails(invoiceRes.data.data);
          setIsInvoiceDrawerOpen(true);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const handleCompletePayment = async () => {
    if (!invoiceDetails) return;
    setProcessingPayment(true);
    try {
      const res = await api.post('/billing/pay', {
        billId: invoiceDetails._id,
        paymentMethod: selectedPaymentMethod
      });
      if (res.data.status === 'success') {
        toast.success('Payment completed successfully!');
        setIsInvoiceDrawerOpen(false);
        setInvoiceDetails(null);
        // Refresh orders list
        const ordersRes = await api.get('/orders');
        setOrders(ordersRes.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  useEffect(() => {
    // 1. Fetch initial orders
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

    // 2. Fetch menu items for mock ordering
    const fetchMenu = async () => {
      try {
        const res = await api.get('/menu/items');
        setMenuItems(res.data.data);
      } catch (err) {
        console.error('Menu load failed', err);
      }
    };

    const fetchTables = async () => {
      try {
        const res = await api.get('/tables');
        setTables(res.data.data);
        if (res.data.data.length > 0) {
          setNewOrderForm(prev => ({ ...prev, tableNumber: res.data.data[0].tableNumber }));
        }
      } catch (err) {
        console.error('Tables load failed', err);
      }
    };

    fetchOrders();
    fetchMenu();
    fetchTables();

    // 3. Listen to WebSocket events on the shared socket connection
    if (socket) {
      const handleNewOrder = (newOrder) => {
        console.log('[Socket] Received new_order:', newOrder);
        if (!newOrder) return;
        const newId = newOrder._id || newOrder.id;
        if (!newId) return;

        setOrders(prev => {
          console.log('[Socket] Current orders in state:', prev.map(o => ({ _id: o._id, id: o.id, tableNumber: o.tableNumber })));
          const exists = prev.some(o => (o._id || o.id) === newId);
          if (exists) {
            console.log('[Socket] Order already exists, replacing/updating: ', newId);
            return prev.map(o => ((o._id || o.id) === newId) ? newOrder : o);
          }
          console.log('[Socket] New order, adding to state list: ', newId);
          return [newOrder, ...prev];
        });
      };

      const handleStatusUpdated = ({ orderId, status, paymentStatus, order }) => {
        console.log('[Socket] Received order_status_updated:', { orderId, status, paymentStatus, hasOrder: !!order });
        if (!orderId) return;

        setOrders(prev => prev.map(o => {
          const currentId = o._id || o.id;
          if (currentId === orderId) {
            console.log('[Socket] Updating order status in state list:', orderId, status);
            return order ? order : { ...o, status, paymentStatus: paymentStatus || o.paymentStatus };
          }
          return o;
        }));
      };

      socket.on('new_order', handleNewOrder);
      socket.on('order_status_updated', handleStatusUpdated);

      return () => {
        socket.off('new_order', handleNewOrder);
        socket.off('order_status_updated', handleStatusUpdated);
      };
    }
  }, [socket]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Ticket marked as: ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update ticket status');
    }
  };

  const handleUpdateItemStatus = async (itemId, nextStatus) => {
    try {
      await api.patch(`/orders/items/${itemId}/status`, { status: nextStatus });
      toast.success(`Item status updated to ${nextStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item status');
    }
  };

  const handlePay = async (orderId, total) => {
    try {
      await api.post(`/orders/${orderId}/pay`, {
        amount: total,
        paymentMethod: 'cash'
      });
      toast.success('Ticket paid and completed!');
    } catch (err) {
      toast.error('Payment checkout failed');
    }
  };

  const addMockItem = (item) => {
    setNewOrderForm(prev => {
      const existingIdx = prev.items.findIndex(i => i.menuItemId === item._id);
      if (existingIdx > -1) {
        const updated = [...prev.items];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return { ...prev, items: updated };
      }
      return {
        ...prev,
        items: [...prev.items, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }]
      };
    });
  };

  const handleAddTable = async () => {
    try {
      await api.post('/tables', newTableForm);
      toast.success('Table added');
      setIsAddTableDrawerOpen(false);
      const res = await api.get('/tables');
      setTables(res.data.data);
      setNewTableForm({ tableNumber: '', capacity: 4 });
    } catch (err) {
      toast.error('Failed to add table');
    }
  };

  const handleOrderTypeChange = (type) => {
    setNewOrderForm(prev => ({
      ...prev,
      orderType: type,
      tableNumber: type === 'dine-in' ? (tables[0]?.tableNumber || '') : (type === 'takeaway' ? 'Takeaway' : 'Delivery')
    }));
  };

  const submitOrder = async () => {
    if (newOrderForm.items.length === 0) {
      toast.error('Please add at least one menu item.');
      return;
    }
    if (newOrderForm.orderType === 'dine-in' && !newOrderForm.tableNumber) {
      toast.error('Please select a table.');
      return;
    }
    try {
      await api.post('/orders', newOrderForm);
      toast.success('Order ticket registered!');
      setIsNewOrderDrawerOpen(false);
      setNewOrderForm({
        tableNumber: tables[0]?.tableNumber || '',
        orderType: 'dine-in',
        customerPhone: '',
        customerName: '',
        items: []
      });
    } catch (err) {
      toast.error('Failed to create order ticket');
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const isActive = ['pending', 'preparing', 'ready'].includes(o.status);
    if (activeTab === 'active') {
      return isActive;
    } else {
      // Completed / Cancelled tab
      if (isActive) return false;

      // Status filter
      if (completedStatusFilter !== 'all' && o.status !== completedStatusFilter) {
        return false;
      }

      // Order type filter
      if (completedOrderTypeFilter !== 'all' && o.orderType !== completedOrderTypeFilter) {
        return false;
      }

      // Text search
      if (completedSearch.trim() !== '') {
        const query = completedSearch.toLowerCase().trim();
        const tableNum = (o.tableNumber || '').toLowerCase();
        const orderTypeStr = (o.orderType || '').toLowerCase();
        const waiterName = (o.waiterId?.name || '').toLowerCase();
        const totalStr = (o.total || '').toString();
        const orderId = (o._id || o.id || '').toLowerCase();

        return (
          tableNum.includes(query) ||
          orderTypeStr.includes(query) ||
          waiterName.includes(query) ||
          totalStr.includes(query) ||
          orderId.includes(query)
        );
      }

      return true;
    }
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading mb-1 text-dark-900 dark:text-white">Orders Manager</h1>
          <p className="text-xs text-dark-500">Coordinate and track live orders under kitchen prep</p>
        </div>
        <Button variant="primary" onClick={() => setIsNewOrderDrawerOpen(true)}>
          Place Ticket
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-250 dark:border-dark-800 space-x-6 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`text-sm font-semibold pb-1 cursor-pointer ${activeTab === 'active' ? 'text-brand-650 border-b-2 border-brand-650' : 'text-dark-500'}`}
        >
          Active Orders
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`text-sm font-semibold pb-1 cursor-pointer ${activeTab === 'completed' ? 'text-brand-650 border-b-2 border-brand-650' : 'text-dark-500'}`}
        >
          Completed / Cancelled
        </button>
      </div>

      {/* Completed Orders Filters */}
      {activeTab === 'completed' && (
        <div className="flex flex-col md:flex-row gap-4 bg-dark-50 dark:bg-dark-900/20 p-4 rounded-xl border border-dark-150 dark:border-dark-800/80 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-dark-500 block mb-1.5">Search</label>
            <Input
              type="text"
              placeholder="Search table, service, waiter, or total amount..."
              value={completedSearch}
              onChange={(e) => setCompletedSearch(e.target.value)}
              className="w-full"
            />
          </div> 
          <div className="w-full md:w-48">
            <label className="text-xs font-semibold text-dark-500 block mb-1.5">Status</label>
            <Select
              value={completedStatusFilter}
              onChange={(e) => setCompletedStatusFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <label className="text-xs font-semibold text-dark-500 block mb-1.5">Service Type</label>
            <Select
              value={completedOrderTypeFilter}
              onChange={(e) => setCompletedOrderTypeFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Service Types</option>
              <option value="dine-in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </Select>
          </div>
          {(completedSearch || completedStatusFilter !== 'all' || completedOrderTypeFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setCompletedSearch('');
                setCompletedStatusFilter('all');
                setCompletedOrderTypeFilter('all');
              }}
              className="w-full md:w-auto px-4"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center text-dark-400 py-16">
          {activeTab === 'active' ? 'No Active Orders' : 'No Previous Orders'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const orderItems = order.items || [];
            const pendingCount = orderItems.filter(i => ['pending', 'preparing'].includes(i.status)).length;
            const readyCount = orderItems.filter(i => ['ready', 'served'].includes(i.status)).length;
            const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <Card
                key={order._id || order.id}
                onClick={() => setSelectedOrderForPopup(order)}
                className="border-t-4 border-t-brand-500 flex flex-col justify-between min-h-[180px] shadow-md bg-white dark:bg-dark-850 cursor-pointer hover:border-brand-500 transition-all duration-200"
              >
                <CardHeader className="pb-2 border-b border-dark-100 dark:border-dark-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-extrabold text-dark-900 dark:text-white font-heading">
                        {order.tableNumber ? (order.tableNumber.toLowerCase().startsWith('table') ? order.tableNumber : `Table ${order.tableNumber}`) : 'Direct Service'}
                      </CardTitle>
                      <p className="text-[11px] text-dark-400 mt-1 uppercase font-semibold tracking-wider flex items-center gap-1.5">
                        <span>{order.orderType}</span>
                        <span>•</span>
                        <span>{orderTime}</span>
                      </p>
                    </div>
                    <Badge variant={
                      order.status === 'completed' ? 'success' :
                      order.status === 'cancelled' ? 'danger' :
                      order.status === 'pending' ? 'info' :
                      order.status === 'preparing' ? 'warning' : 'secondary'
                    }>
                      {order.status}
                    </Badge>
                  </div>

                  {/* Summary Status Badges */}
                  {activeTab === 'active' && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        Pending: {pendingCount}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Ready: {readyCount}
                      </span>
                    </div>
                  )}
                </CardHeader>

                <div className="p-5 border-t border-dark-100 dark:border-dark-800 flex justify-between items-center bg-dark-50/50 dark:bg-dark-900/50">
                  <div className="text-sm">
                    <span className="text-dark-400 block text-xs">Total Bill</span>
                    <span className="font-bold text-base text-dark-800 dark:text-white">{formatCurrency(order.total, currencyCode)}</span>
                  </div>
                  <div className="text-xs text-brand-650 dark:text-brand-400 font-bold uppercase tracking-wider">
                    {activeTab === 'active' ? 'Click to Manage →' : 'Click to View Details →'}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Order Action Sheet Popup */}
      <Drawer
        isOpen={!!(selectedOrderForPopup && orders.find(o => (o._id || o.id) === (selectedOrderForPopup._id || selectedOrderForPopup.id)))}
        onClose={() => setSelectedOrderForPopup(null)}
        title={
          (() => {
            const matched = selectedOrderForPopup ? orders.find(o => (o._id || o.id) === (selectedOrderForPopup._id || selectedOrderForPopup.id)) : null;
            if (!matched) return '';
            const serviceStr = matched.tableNumber ? (matched.tableNumber.toLowerCase().startsWith('table') ? matched.tableNumber : `Table ${matched.tableNumber}`) : 'Direct Service';
            const suffix = ['completed', 'cancelled'].includes(matched.status) ? 'Receipt Overview' : 'Management';
            return `${serviceStr} ${suffix}`;
          })()
        }
        className="max-w-full sm:max-w-md md:max-w-lg transition-all duration-300"
      >
        {(() => {
          const activePopupOrder = selectedOrderForPopup ? orders.find(o => (o._id || o.id) === (selectedOrderForPopup._id || selectedOrderForPopup.id)) : null;
          if (!activePopupOrder) return null;

          const orderItems = activePopupOrder.items || [];
          const pendingCount = orderItems.filter(i => ['pending', 'preparing'].includes(i.status)).length;
          const readyCount = orderItems.filter(i => ['ready', 'served'].includes(i.status)).length;
          
          const groupedPending = orderItems.filter(i => ['pending', 'preparing'].includes(i.status));
          const groupedReady = orderItems.filter(i => ['ready', 'served'].includes(i.status));

          const orderTime = new Date(activePopupOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isFinalized = ['completed', 'cancelled'].includes(activePopupOrder.status);

          return (
            <div className="flex flex-col h-full justify-between text-left pb-16">
              <div className="space-y-6 overflow-y-auto max-h-[75vh] pr-1">
                {/* Meta details */}
                <div className="bg-dark-50 dark:bg-dark-850 p-4 rounded-xl border border-dark-200 dark:border-dark-800 flex justify-between gap-4 text-xs">
                  <div>
                    <span className="text-dark-400 block font-semibold uppercase tracking-wider">Type</span>
                    <span className="font-bold text-dark-800 dark:text-white capitalize">{activePopupOrder.orderType}</span>
                  </div>
                  <div>
                    <span className="text-dark-400 block font-semibold uppercase tracking-wider">Time</span>
                    <span className="font-bold text-dark-800 dark:text-white">{orderTime}</span>
                  </div>
                  <div>
                    <span className="text-dark-400 block font-semibold uppercase tracking-wider">State</span>
                    <Badge variant={
                      activePopupOrder.status === 'completed' ? 'success' :
                      activePopupOrder.status === 'cancelled' ? 'danger' :
                      activePopupOrder.status === 'pending' ? 'info' :
                      activePopupOrder.status === 'preparing' ? 'warning' : 'secondary'
                    }>
                      {activePopupOrder.status}
                    </Badge>
                  </div>
                </div>

                {isFinalized && (
                  <div className="bg-dark-50 dark:bg-dark-850 p-4 rounded-xl border border-dark-200 dark:border-dark-800 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-dark-400 font-semibold uppercase tracking-wider text-[10px]">Order ID</span>
                      <span className="font-bold text-dark-800 dark:text-white">#{activePopupOrder._id.substring(activePopupOrder._id.length - 8)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dark-400 font-semibold uppercase tracking-wider text-[10px]">Placed By</span>
                      <span className="font-bold text-dark-800 dark:text-white">{activePopupOrder.waiterId?.name || 'Self Order / Admin'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dark-400 font-semibold uppercase tracking-wider text-[10px]">Payment Status</span>
                      <Badge variant={activePopupOrder.paymentStatus === 'paid' ? 'success' : 'danger'} className="font-bold">
                        {activePopupOrder.paymentStatus || 'unpaid'}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Items Section */}
                 <div className="space-y-4">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400">{isFinalized ? 'Receipt Items' : 'Order Items'}</h4>
 
                   {isFinalized ? (
                     <div className="space-y-1.5 bg-dark-50 dark:bg-dark-900/50 p-3 rounded-xl border border-dark-150 dark:border-dark-805">
                       {orderItems.map((item, idx) => (
                         <div key={item._id || idx} className="flex justify-between items-center gap-2 text-xs py-1.5 border-b border-dark-100 dark:border-dark-800 last:border-0">
                           <span className="text-dark-800 dark:text-white font-medium truncate flex-1">
                             {item.quantity}x {item.name}
                           </span>
                           <span className="font-semibold text-dark-600 dark:text-dark-350 flex-shrink-0">
                             {formatCurrency(item.subtotal || (item.price * item.quantity), currencyCode)}
                           </span>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <>
                       {/* PENDING ITEMS */}
                       {groupedPending.length > 0 && (
                         <div className="space-y-1.5">
                           <p className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Pending ({pendingCount})</p>
                           <div className="space-y-1.5 bg-sky-500/5 p-3 rounded-xl border border-sky-500/10">
                             {groupedPending.map((item, idx) => (
                               <div key={item._id || idx} className="flex justify-between items-center gap-2 text-xs py-1.5 border-b border-sky-500/10 last:border-0">
                                 <span className="text-dark-800 dark:text-white font-medium truncate flex-1">
                                   {item.quantity}x {item.name}
                                 </span>
                                 <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                   <span className="font-semibold text-dark-600 dark:text-dark-350">{formatCurrency(item.subtotal || (item.price * item.quantity), currencyCode)}</span>
                                   <Button
                                     variant="accent"
                                     size="sm"
                                     onClick={() => handleUpdateItemStatus(item._id, 'ready')}
                                     className="h-7 text-[10px] px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shrink-0"
                                   >
                                     Ready
                                   </Button>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}

                       {/* READY ITEMS */}
                       {groupedReady.length > 0 && (
                         <div className="space-y-1.5">
                           <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-450 uppercase tracking-wider">Ready ({readyCount})</p>
                           <div className="space-y-1.5 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                             {groupedReady.map((item, idx) => (
                               <div key={item._id || idx} className="flex justify-between items-center gap-2 text-xs py-1.5 opacity-70 border-b border-emerald-500/10 last:border-0">
                                 <span className="text-dark-800 dark:text-white font-medium line-through truncate flex-1">
                                   {item.quantity}x {item.name}
                                 </span>
                                 <span className="font-semibold text-dark-650 dark:text-dark-300 flex-shrink-0">{formatCurrency(item.subtotal || (item.price * item.quantity), currencyCode)}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </>
                   )}
                 </div>

                {/* Subtotals */}
                <div className="border-t border-dark-200 dark:border-dark-800 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-dark-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-dark-850 dark:text-white">{formatCurrency(activePopupOrder.subtotal, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-dark-500">
                    <span>GST & Tax</span>
                    <span className="font-semibold text-dark-850 dark:text-white">{formatCurrency(activePopupOrder.tax, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-extrabold text-dark-900 dark:text-white">
                    <span>Grand Total</span>
                    <span>{formatCurrency(activePopupOrder.total, currencyCode)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-dark-900 p-4 border-t border-dark-200 dark:border-dark-800 flex gap-3 z-30 max-w-full sm:max-w-md md:max-w-lg ml-auto">
                {activePopupOrder.status === 'pending' && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      updateStatus(activePopupOrder._id || activePopupOrder.id, 'cancelled');
                      setSelectedOrderForPopup(null);
                    }}
                    className="flex-1 h-11"
                  >
                    Cancel Ticket
                  </Button>
                )}
                {['pending', 'preparing', 'ready', 'billing'].includes(activePopupOrder.status) && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      handlePayBillClick(activePopupOrder);
                      setSelectedOrderForPopup(null);
                    }}
                    className="flex-1 h-11 bg-brand-600 hover:bg-brand-700 text-white font-bold border-none"
                  >
                    Pay Bill
                  </Button>
                )}
                {isFinalized && (
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedOrderForPopup(null)}
                    className="flex-1 h-11 font-bold"
                  >
                    Close Details
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* Place Mock Order Drawer */}
      <Drawer isOpen={isNewOrderDrawerOpen} onClose={() => setIsNewOrderDrawerOpen(false)} title="Simulate Table Order">
        <div className="space-y-6 text-left">
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Service Type</label>
            <Select value={newOrderForm.orderType} onChange={e => handleOrderTypeChange(e.target.value)}>
              <option value="dine-in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </Select>
          </div>

          {newOrderForm.orderType === 'dine-in' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block">Table Number</label>
                <Button variant="ghost" size="sm" onClick={() => setIsAddTableDrawerOpen(true)} className="text-xs h-6 px-2">
                  + Add Table
                </Button>
              </div>
              <Select value={newOrderForm.tableNumber} onChange={e => setNewOrderForm({ ...newOrderForm, tableNumber: e.target.value })}>
                <option value="">Select Table...</option>
                {tables.map(t => (
                  <option key={t._id} value={t.tableNumber}>Table {t.tableNumber} ({t.capacity} pax)</option>
                ))}
              </Select>
            </div>
          )}

          <div className="border-t border-dark-200 dark:border-dark-800 pt-4">
            <h4 className="text-sm font-semibold mb-3">Add Menu Dishes</h4>
            {menuItems.length === 0 ? (
              <p className="text-xs text-dark-400">Create Category & Menu Items in Menu Config panel first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {menuItems.map(item => (
                  <button
                    key={item._id}
                    onClick={() => addMockItem(item)}
                    className="flex justify-between items-center text-xs border border-dark-200 dark:border-dark-800 p-2 rounded-lg bg-dark-50 hover:bg-dark-100 dark:bg-dark-900 text-left transition-colors cursor-pointer"
                  >
                    <span>{item.name}</span>
                    <span className="font-bold text-brand-650">{formatCurrency(item.price, currencyCode)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-dark-200 dark:border-dark-800 pt-4">
            <h4 className="text-sm font-semibold mb-2">Order Line-Items</h4>
            {newOrderForm.items.length === 0 ? (
              <p className="text-xs text-dark-450 italic">No dishes selected yet.</p>
            ) : (
              <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                {newOrderForm.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-xs py-1 border-b border-dark-100 dark:border-dark-850">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.price * item.quantity, currencyCode)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button variant="primary" className="w-full" onClick={submitOrder} disabled={newOrderForm.items.length === 0}>
            Submit Kitchen Ticket
          </Button>
        </div>
      </Drawer>

      {/* Add Table Drawer */}
      <Drawer isOpen={isAddTableDrawerOpen} onClose={() => setIsAddTableDrawerOpen(false)} title="Add New Table">
        <div className="space-y-6 text-left">
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Table Label / Number</label>
            <Input placeholder="e.g., 10, A2, Patio 1" value={newTableForm.tableNumber} onChange={e => setNewTableForm({ ...newTableForm, tableNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Capacity (pax)</label>
            <Input type="number" placeholder="4" value={newTableForm.capacity} onChange={e => setNewTableForm({ ...newTableForm, capacity: e.target.value })} />
          </div>
          <Button variant="primary" className="w-full" onClick={handleAddTable} disabled={!newTableForm.tableNumber}>
            Save Table
          </Button>
        </div>
      </Drawer>

      {/* Invoice Drawer */}
      <Drawer isOpen={isInvoiceDrawerOpen} onClose={() => setIsInvoiceDrawerOpen(false)} title="Invoice Receipt">
        {invoiceDetails && (
          <div className="space-y-6 text-left text-dark-800 dark:text-dark-100">
            <div id="invoice-print-area" className="bg-white dark:bg-dark-850 p-6 rounded-xl border border-dark-200 dark:border-dark-800 shadow-inner max-w-md mx-auto font-mono">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white uppercase">
                  {invoiceDetails.restaurantId?.name || 'Restaurant'}
                </h3>
                <p className="text-xs text-dark-500 mt-1">
                  {invoiceDetails.branchId?.address || 'Main Branch'}<br/>
                  Phone: {invoiceDetails.branchId?.phone || 'N/A'}<br/>
                  GSTIN: {invoiceDetails.branchId?.gstNumber || 'N/A'}
                </p>
              </div>
              
              <div className="border-t border-dashed border-dark-300 dark:border-dark-700 my-3"></div>
              
              <div className="text-xs space-y-1 text-dark-600 dark:text-dark-400">
                <div className="flex justify-between">
                  <span>Invoice No:</span>
                  <span className="font-bold text-dark-800 dark:text-dark-200">{invoiceDetails.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Table / Service:</span>
                  <span className="font-bold text-dark-800 dark:text-dark-200">
                    {invoiceDetails.tableId?.tableNumber ? `Table ${invoiceDetails.tableId.tableNumber}` : (invoiceDetails.orderId?.tableNumber || 'N/A')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Waiter Name:</span>
                  <span className="text-dark-800 dark:text-dark-200">{invoiceDetails.waiterId?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span className="text-dark-800 dark:text-dark-200">
                    {new Date(invoiceDetails.createdAt).toLocaleDateString()} {new Date(invoiceDetails.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-dashed border-dark-300 dark:border-dark-700 my-3"></div>
              
              <div className="text-xs space-y-2">
                <div className="grid grid-cols-12 font-bold text-dark-800 dark:text-dark-200">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                
                <div className="space-y-1">
                  {(invoiceDetails.items || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-dark-600 dark:text-dark-400">
                      <div className="col-span-6 truncate">{item.name}</div>
                      <div className="col-span-2 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right">{formatCurrency(item.price, currencyCode)}</div>
                      <div className="col-span-2 text-right">{formatCurrency(item.subtotal, currencyCode)}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-dashed border-dark-300 dark:border-dark-700 my-3"></div>
              
              <div className="text-xs space-y-1.5 text-right">
                <div className="flex justify-between">
                  <span className="text-dark-500">Subtotal:</span>
                  <span className="font-semibold text-dark-800 dark:text-dark-200">{formatCurrency(invoiceDetails.subtotal, currencyCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">GST ({invoiceDetails.gstPercentage}%):</span>
                  <span className="font-semibold text-dark-800 dark:text-dark-200">{formatCurrency(invoiceDetails.gstAmount, currencyCode)}</span>
                </div>
                <div className="border-t border-dashed border-dark-300 dark:border-dark-700 my-2"></div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-dark-900 dark:text-white">Grand Total:</span>
                  <span className="text-brand-600 dark:text-brand-400">{formatCurrency(invoiceDetails.grandTotal, currencyCode)}</span>
                </div>
              </div>
              
              <div className="border-t border-dashed border-dark-300 dark:border-dark-700 my-3"></div>
              <div className="text-center text-[10px] text-dark-400">
                Thank you for dining with us!<br/>
                Powered by Vyavastha
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-dark-250 dark:border-dark-800">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    const printDetails = {
                      restaurantName: invoiceDetails.restaurantId?.name || 'Restaurant',
                      restaurantAddress: invoiceDetails.branchId?.address,
                      restaurantPhone: invoiceDetails.branchId?.phone,
                      gstNumber: invoiceDetails.branchId?.gstNumber,
                      invoiceNumber: invoiceDetails.invoiceNumber,
                      tableNumber: invoiceDetails.tableId?.tableNumber || invoiceDetails.orderId?.tableNumber || 'N/A',
                      waiterName: invoiceDetails.waiterId?.name,
                      createdAt: invoiceDetails.createdAt,
                      items: invoiceDetails.items,
                      subtotal: invoiceDetails.subtotal,
                      gstPercentage: invoiceDetails.gstPercentage,
                      gstAmount: invoiceDetails.gstAmount,
                      grandTotal: invoiceDetails.grandTotal
                    };
                    handlePrint(printDetails);
                  }}
                >
                  Print Receipt
                </Button>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-dark-500 block mb-2">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'UPI', 'Card'].map(method => (
                    <button
                      key={method}
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${selectedPaymentMethod === method ? 'bg-brand-600 text-white border-brand-600' : 'bg-dark-50 hover:bg-dark-100 dark:bg-dark-900 border-dark-250 dark:border-dark-800 text-dark-700 dark:text-dark-300'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button 
                variant="primary" 
                className="w-full"
                onClick={handleCompletePayment}
                disabled={processingPayment}
              >
                {processingPayment ? <Spinner size="sm" /> : `Pay & Close (${selectedPaymentMethod})`}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default OrdersManager;
