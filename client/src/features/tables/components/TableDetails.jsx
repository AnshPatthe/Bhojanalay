import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Drawer, Button, Badge, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useWaiterAuth } from '@/features/waiter/store/useWaiterAuth';
import { formatCurrency } from '@/utils/formatCurrency';
import { Clock, User, CheckCircle2, AlertTriangle, CreditCard, ChevronRight, Plus, Printer } from 'lucide-react';
import api from '@/api';
import waiterApi from '@/features/waiter/api/waiterApi';
import { useNavigate } from 'react-router-dom';

export const TableDetails = ({ isOpen, onClose, table, socket }) => {
  const navigate = useNavigate();
  const { isAuthenticated, currentRestaurant } = useAuthStore();
  const { waiter } = useWaiterAuth();

  const activeAxios = isAuthenticated ? api : waiterApi;
  const currencyCode = currentRestaurant?.currency || 'INR';

  const [activeOrder, setActiveOrder] = useState(null);
  const [bill, setBill] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'history'
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Billing states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const fetchActiveDetails = async () => {
    if (!table) return;
    setLoadingActive(true);
    try {
      const res = await activeAxios.get(`/billing/${table._id}`);
      if (res.data.status === 'success') {
        setActiveOrder(res.data.data.order);
        setBill(res.data.data.bill);
      }
    } catch (err) {
      setActiveOrder(null);
      setBill(null);
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchHistoryDetails = async () => {
    if (!table) return;
    setLoadingHistory(true);
    try {
      const res = await activeAxios.get(`/billing/history/${table._id}`);
      if (res.data.status === 'success') {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('History fetch failed', err);
      toast.error('Failed to load table history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen && table) {
      fetchActiveDetails();
      fetchHistoryDetails();
    } else {
      setActiveOrder(null);
      setBill(null);
      setHistory([]);
      setActiveTab('current');
    }
  }, [isOpen, table]);

  // Socket sync
  useEffect(() => {
    if (!socket || !table) return;

    const handleSync = () => {
      fetchActiveDetails();
    };

    socket.on('tables_updated', handleSync);
    socket.on('order_status_updated', handleSync);

    return () => {
      socket.off('tables_updated', handleSync);
      socket.off('order_status_updated', handleSync);
    };
  }, [socket, table]);

  // Individual item status updater
  const handleUpdateItemStatus = async (itemId, nextStatus) => {
    try {
      await activeAxios.patch(`/orders/items/${itemId}/status`, { status: nextStatus });
      toast.success(`Item status updated to ${nextStatus}.`);
      fetchActiveDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item status.');
    }
  };

  // Close Table: Occupied -> Billing
  const handleCloseTable = async () => {
    try {
      const res = await activeAxios.post('/billing/close-table', { tableId: table._id });
      if (res.data.status === 'success') {
        toast.success('Table closed successfully. Moved to Billing state.');
        fetchActiveDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close table.');
    }
  };

  // Generate / Show Bill Invoice
  const handlePayBillClick = async () => {
    if (!activeOrder) return;
    try {
      const res = await activeAxios.post('/billing/generate', {
        orderId: activeOrder._id,
        tableId: table._id
      });
      if (res.data.status === 'success') {
        const billId = res.data.data._id;
        const invoiceRes = await activeAxios.get(`/billing/invoice/${billId}`);
        if (invoiceRes.data.status === 'success') {
          setInvoiceDetails(invoiceRes.data.data);
          setIsInvoiceDrawerOpen(true);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice.');
    }
  };

  // Complete Payment checkout flow
  const handleCompletePayment = async () => {
    if (!invoiceDetails) return;
    setProcessingPayment(true);
    try {
      const res = await activeAxios.post('/billing/pay', {
        billId: invoiceDetails._id,
        paymentMethod: selectedPaymentMethod
      });
      if (res.data.status === 'success') {
        toast.success('Payment completed successfully!');
        setIsInvoiceDrawerOpen(false);
        setInvoiceDetails(null);
        setActiveOrder(null);
        setBill(null);
        fetchHistoryDetails();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete payment.');
    } finally {
      setProcessingPayment(false);
    }
  };

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
            <h2>${invoice.restaurantId?.name || currentRestaurant?.name || 'Vyavastha Restaurant'}</h2>
            <div class="header-info">
              ${invoice.branchId?.address || 'Main Branch'}<br/>
              Phone: ${invoice.branchId?.phone || 'N/A'}<br/>
              GSTIN: ${invoice.branchId?.gstNumber || 'N/A'}
            </div>
          </div>
          <div class="divider"></div>
          <div class="header-info">
            <strong>Invoice:</strong> ${invoice.invoiceNumber}<br/>
            <strong>Table:</strong> Table ${invoice.tableId?.tableNumber || table?.tableNumber}<br/>
            <strong>Waiter:</strong> ${invoice.waiterId?.name || 'N/A'}<br/>
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

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Occupied':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'Billing':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-dark-500/10 text-dark-600 border-dark-500/20';
    }
  };

  const orderItems = activeOrder?.items || [];
  const pendingItems = orderItems.filter(i => ['pending', 'preparing'].includes(i.status));
  const readyItems = orderItems.filter(i => ['ready', 'served'].includes(i.status));

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={`${table?.tableNumber ? (table.tableNumber.toLowerCase().startsWith('table') ? table.tableNumber : `Table ${table.tableNumber}`) : ''} Overview`}
        className="max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl transition-all duration-300"
      >
        <div className="flex flex-col h-full text-left pb-16">
          {/* Header Stats */}
          <div className="bg-dark-50 dark:bg-dark-850 p-4 rounded-xl border border-dark-200 dark:border-dark-800 flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Status</p>
              <Badge className={`mt-1 font-bold ${getStatusBadgeColor(table?.status)}`}>
                {table?.status}
              </Badge>
            </div>
            {table?.floor && (
              <div className="text-right">
                <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Floor</p>
                <p className="text-sm font-bold text-dark-800 dark:text-white mt-1">{table?.floor}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Capacity</p>
              <p className="text-sm font-bold text-dark-800 dark:text-white mt-1">{table?.capacity} pax</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-dark-250 dark:border-dark-800 space-x-6 pb-2 mb-4">
            <button
              onClick={() => setActiveTab('current')}
              className={`text-sm font-semibold pb-1 cursor-pointer transition-all ${
                activeTab === 'current' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-dark-500'
              }`}
            >
              Current Order
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`text-sm font-semibold pb-1 cursor-pointer transition-all ${
                activeTab === 'history' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-dark-500'
              }`}
            >
              Previous Orders
            </button>
          </div>

          {/* Drawer Body Container */}
          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === 'current' ? (
              loadingActive ? (
                <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>
              ) : !activeOrder ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <AlertTriangle className="h-10 w-10 text-dark-400 mb-3" />
                  <h3 className="text-base font-bold text-dark-700 dark:text-dark-300">Not Yet Booked</h3>
                  <p className="text-xs text-dark-500 mt-1 max-w-xs">There is no active order session created for this table.</p>
                  {!isAuthenticated && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        onClose();
                        navigate(`/waiter/order/${table._id}`);
                      }}
                      className="mt-4 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Start Booking
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6 pb-24">
                  {/* Order Meta Info */}
                  <div className="space-y-2 border-b border-dark-100 dark:border-dark-800 pb-4">
                    <div className="flex justify-between items-center text-xs text-dark-500">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Booked since:</span>
                      <span className="font-semibold text-dark-700 dark:text-dark-300">
                        {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-dark-500">
                      <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Waiter:</span>
                      <span className="font-semibold text-dark-700 dark:text-dark-300">
                        {activeOrder.waiterId?.name || 'Self Order / Admin'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-dark-500">
                      <span>Order ID:</span>
                      <span className="font-semibold text-dark-700 dark:text-dark-300">
                        #{activeOrder._id.substring(activeOrder._id.length - 8)}
                      </span>
                    </div>
                  </div>

                  {/* Active Order Items List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400">Order Items</h4>

                    {/* NEW / PENDING ITEMS */}
                    {pendingItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-655 dark:text-sky-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                            PENDING ({pendingItems.length})
                          </span>
                        </div>
                        <div className="bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 space-y-2">
                          {pendingItems.map((item) => (
                            <div key={item._id} className="flex justify-between items-center gap-2 text-xs py-1.5 border-b border-sky-500/10 last:border-0">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-dark-800 dark:text-white truncate sm:whitespace-normal">{item.quantity}x {item.name}</p>
                                {item.notes && <p className="text-[10px] text-sky-600 mt-0.5 font-medium break-words">✏️ {item.notes}</p>}
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                <span className="font-semibold text-dark-600 dark:text-dark-300">{formatCurrency(item.subtotal, currencyCode)}</span>
                                {isAuthenticated && (
                                  <Button
                                    variant="accent"
                                    size="sm"
                                    onClick={() => handleUpdateItemStatus(item._id, 'ready')}
                                    className="h-7 text-[10px] px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shrink-0"
                                  >
                                    Ready
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* READY ITEMS */}
                    {readyItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            READY TO SERVE ({readyItems.length})
                          </span>
                        </div>
                        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                          {readyItems.map((item) => (
                            <div key={item._id} className="flex justify-between items-center gap-2 text-xs py-1.5 border-b border-emerald-500/10 last:border-0">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-dark-800 dark:text-white line-through opacity-70 truncate sm:whitespace-normal">{item.quantity}x {item.name}</p>
                              </div>
                              <span className="font-semibold text-dark-600 dark:text-dark-300 flex-shrink-0">{formatCurrency(item.subtotal, currencyCode)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Totals */}
                  <div className="border-t border-dark-200 dark:border-dark-800 pt-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs text-dark-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-dark-800 dark:text-white">{formatCurrency(activeOrder.subtotal, currencyCode)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-dark-500">
                      <span>Taxes & GST</span>
                      <span className="font-semibold text-dark-800 dark:text-white">{formatCurrency(activeOrder.tax, currencyCode)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-extrabold text-dark-900 dark:text-white">
                      <span>Grand Total</span>
                      <span>{formatCurrency(activeOrder.total, currencyCode)}</span>
                    </div>
                  </div>

                  {/* Operational Footer Actions */}
                  <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-dark-900 p-4 border-t border-dark-200 dark:border-dark-800 flex gap-3 z-30 max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl ml-auto">
                    {/* Add Items Action */}
                    {table?.status === 'Occupied' && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          onClose();
                          navigate(`/waiter/order/${table._id}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-11"
                      >
                        <Plus className="h-4 w-4" /> Add Dishes
                      </Button>
                    )}

                    {/* Close Table Button */}
                    {table?.status === 'Occupied' && (
                      <Button
                        variant="primary"
                        onClick={handleCloseTable}
                        className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 border-none font-bold"
                      >
                        Close Table
                      </Button>
                    )}

                    {/* Pay Bill Trigger */}
                    {table?.status === 'Billing' && (
                      <Button
                        variant="primary"
                        onClick={handlePayBillClick}
                        className="w-full h-11 bg-purple-600 hover:bg-purple-700 border-none font-bold flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" /> Pay Bill & Checkout
                      </Button>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* History Section */
              loadingHistory ? (
                <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>
              ) : history.length === 0 ? (
                <div className="text-center text-dark-455 py-16">No Previous Orders</div>
              ) : (
                <div className="space-y-3 pb-8">
                  {history.map((billDoc) => {
                    const isExpanded = expandedHistoryId === billDoc._id;
                    return (
                      <div
                        key={billDoc._id}
                        className="border border-dark-200 dark:border-dark-800 rounded-xl bg-white dark:bg-dark-850 p-4 space-y-3"
                      >
                        {/* Summary Header */}
                        <div
                          className="flex justify-between items-center cursor-pointer"
                          onClick={() => setExpandedHistoryId(isExpanded ? null : billDoc._id)}
                        >
                          <div>
                            <p className="text-xs font-extrabold text-dark-800 dark:text-white">{billDoc.invoiceNumber}</p>
                            <p className="text-[10px] text-dark-400 mt-0.5">
                              {new Date(billDoc.createdAt).toLocaleDateString()} at {new Date(billDoc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-dark-800 dark:text-white">{formatCurrency(billDoc.grandTotal, currencyCode)}</span>
                            <ChevronRight className={`h-4 w-4 text-dark-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Collapsed items breakdown */}
                        {isExpanded && (
                          <div className="border-t border-dark-100 dark:border-dark-800 pt-3 space-y-2 text-xs">
                            {/* Waiter & Payment Info */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-dark-500 font-semibold uppercase tracking-wider mb-2">
                              <div>
                                <span>Waiter:</span>
                                <p className="text-dark-800 dark:text-white normal-case mt-0.5">{billDoc.waiterId?.name || 'Admin/Direct'}</p>
                              </div>
                              <div>
                                <span>Paid via:</span>
                                <p className="text-emerald-600 dark:text-emerald-400 normal-case mt-0.5">{billDoc.paymentMethod || 'Cash'}</p>
                              </div>
                            </div>

                            {/* Itemized summary */}
                            <div className="space-y-1.5 border-b border-dark-100 dark:border-dark-800 pb-2">
                              {billDoc.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-dark-600 dark:text-dark-300">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span>{formatCurrency(item.subtotal, currencyCode)}</span>
                                </div>
                              ))}
                            </div>

                            {/* Actions inside history */}
                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrint(billDoc)}
                                className="h-8 text-[11px] gap-1 px-2.5 text-dark-600 dark:text-dark-450 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-md"
                              >
                                <Printer className="h-3.5 w-3.5" /> Re-Print
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </Drawer>

      {/* consolidated checkout drawer popup */}
      <Drawer
        isOpen={isInvoiceDrawerOpen}
        onClose={() => {
          setIsInvoiceDrawerOpen(false);
          setInvoiceDetails(null);
        }}
        title="Checkout Receipt"
        className="max-w-full sm:max-w-md md:max-w-md z-[60] bg-white dark:bg-dark-900"
      >
        {invoiceDetails && (
          <div className="flex flex-col h-full justify-between text-left space-y-6 pb-16">
            <div className="space-y-4">
              {/* Receipt branding */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-dark-900 dark:text-white font-heading">
                  {invoiceDetails.restaurantId?.name || currentRestaurant?.name || 'Vyavastha OS'}
                </h3>
                <p className="text-xs text-dark-500">
                  {invoiceDetails.branchId?.address || 'Restaurant Branch'}
                </p>
                {invoiceDetails.branchId?.phone && (
                  <p className="text-[10px] text-dark-400">Phone: {invoiceDetails.branchId.phone}</p>
                )}
              </div>

              <div className="border-t border-b border-dashed border-dark-200 dark:border-dark-800 py-3 space-y-1.5 text-xs text-dark-600 dark:text-dark-300">
                <div className="flex justify-between">
                  <span>Invoice:</span>
                  <span className="font-bold text-dark-900 dark:text-white">{invoiceDetails.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Table Number:</span>
                  <span className="font-bold text-dark-900 dark:text-white">Table {table?.tableNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{new Date(invoiceDetails.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400">Checkout Items</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {invoiceDetails.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-dark-800 dark:text-dark-200 font-medium">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-semibold text-dark-700 dark:text-dark-300">
                        {formatCurrency(item.subtotal, currencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-dark-200 dark:border-dark-800 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-dark-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoiceDetails.subtotal, currencyCode)}</span>
                </div>
                <div className="flex justify-between text-dark-500">
                  <span>GST ({invoiceDetails.gstPercentage}%):</span>
                  <span>{formatCurrency(invoiceDetails.gstAmount, currencyCode)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-dark-900 dark:text-white border-t border-dark-100 dark:border-dark-800 pt-2">
                  <span>Grand Total</span>
                  <span className="text-brand-600 dark:text-brand-400">{formatCurrency(invoiceDetails.grandTotal, currencyCode)}</span>
                </div>
              </div>

              {/* Payment selector */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-dark-500 block">Select Payment Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'UPI', 'Card'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        selectedPaymentMethod === method
                          ? 'bg-brand-600 text-white border-brand-650 shadow-sm'
                          : 'bg-white dark:bg-dark-850 border-dark-200 dark:border-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Print & Checkout Actions */}
            <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-dark-900 p-4 border-t border-dark-200 dark:border-dark-800 flex gap-3 z-30 max-w-full sm:max-w-md md:max-w-md ml-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handlePrint(invoiceDetails)}
                className="flex items-center gap-1.5 h-11"
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCompletePayment}
                disabled={processingPayment}
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold"
              >
                {processingPayment ? 'Processing...' : 'Complete Checkout'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default TableDetails;
