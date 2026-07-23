import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useWaiterAuth } from '../store/useWaiterAuth';
import { TableManagement } from '../components/TableManagement';
import {
  LogOut,
  User,
  LayoutDashboard,
  Clock,
  Sun,
  Moon,
  ClipboardList,
  CheckCircle,
  FileText,
  Calendar,
  IndianRupee,
  Bell,
  Settings,
  Menu,
  X,
  Play,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Printer,
  Download,
  Share2,
  Trash2,
  RefreshCw,
  Award,
  History
} from 'lucide-react';
import { getSocket, disconnectSocket } from '@/socket/socketClient';
import waiterApi from '../api/waiterApi';
import { formatCurrency } from '@/utils/formatCurrency';
import { jsPDF } from 'jspdf';

export const WaiterDashboard = () => {
  const { waiter, logout, updateProfile: updateLocalProfile } = useWaiterAuth();
  const navigate = useNavigate();
  const currencyCode = waiter?.restaurantCurrency || 'INR';

  const formatCurrencyPDF = (value, code) => {
    let formatted = formatCurrency(value, code);
    formatted = formatted.replace(/[\u00a0\u202f\u2007\u2060]/g, ' ');
    formatted = formatted
      .replace(/₹/g, 'Rs. ')
      .replace(/€/g, 'EUR ')
      .replace(/£/g, 'GBP ')
      .replace(/[^ -~]/g, '');
    return formatted.trim();
  };

  // State Management
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [socket, setSocket] = useState(null);
  const [readyAlert, setReadyAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveOrdersSubTab, setLiveOrdersSubTab] = useState('preparing');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data States
  const [orders, setOrders] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({
    sick: { allocated: 10, taken: 0, remaining: 10 },
    casual: { allocated: 15, taken: 0, remaining: 15 },
    earned: { allocated: 12, taken: 0, remaining: 12 }
  });
  const [attendance, setAttendance] = useState([]);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [waitersList, setWaitersList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    dob: '',
    profilePhoto: '',
    password: ''
  });

  useEffect(() => {
    if (waiter) {
      setProfileForm({
        name: waiter.name || '',
        phone: waiter.phone || '',
        dob: waiter.dob ? new Date(waiter.dob).toISOString().slice(0, 10) : '',
        profilePhoto: waiter.profilePhoto || '',
        password: ''
      });
    }
  }, [waiter]);

  // Action Modals State
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', type: 'Sick', reason: '' });
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelContext, setCancelContext] = useState({ orderId: null, itemId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferContext, setTransferContext] = useState(null);
  const [selectedTransferWaiterId, setSelectedTransferWaiterId] = useState('');
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitContext, setSplitContext] = useState(null);
  const [splitCount, setSplitCount] = useState(2);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);

  // Time ticks for live timers
  const [timeTick, setTimeTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTimeTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!waiter || !waiter.branchId) return;

    const branchIdStr = waiter.branchId.toString();
    const socketInstance = getSocket(branchIdStr);
    setSocket(socketInstance);

    // Initial fetches
    fetchOrders();
    fetchAttendance();
    fetchLeaveData();
    fetchPayroll();
    fetchWaiters();

    return () => {
      setSocket(null);
    };
  }, [waiter]);

  useEffect(() => {
    if (!socket) return;

    const handleOrderStatusUpdated = (data) => {
      fetchOrders(); // Refresh orders state
      if (data.status === 'ready') {
        const orderDisplayId = data.orderId ? data.orderId.substring(Math.max(0, data.orderId.length - 6)) : '';
        const tableStr = data.order && data.order.tableNumber ? (` for ${data.order.tableNumber}`) : '';

        toast.success(`Order #${orderDisplayId}${tableStr} is Ready! 🍽️`, {
          duration: 8000,
          position: 'top-right',
          id: `order-ready-${data.orderId}`
        });

        // Trigger sound alert
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
          audio.play();
        } catch (e) {
          console.log('Audio playback block', e);
        }

        setReadyAlert({
          orderId: data.orderId,
          tableNumber: data.order?.tableNumber || 'Unknown'
        });
      }
    };

    const handleLeaveStatusUpdated = (data) => {
      fetchLeaveData();
      if (data.status === 'Approved') {
        toast.success('🎉 Your leave request has been GRANTED & APPROVED by Admin!', { duration: 8000 });
      } else if (data.status === 'Rejected') {
        toast.error(`❌ Your leave request was REJECTED by Admin. ${data.adminRemarks ? `Remarks: "${data.adminRemarks}"` : ''}`, { duration: 8000 });
      }
    };

    socket.on('order_status_updated', handleOrderStatusUpdated);
    socket.on('tables_updated', () => fetchOrders());
    socket.on('new_order', () => fetchOrders());
    socket.on('table_status_updated', () => fetchOrders());
    socket.on('leave_status_updated', handleLeaveStatusUpdated);

    return () => {
      socket.off('order_status_updated', handleOrderStatusUpdated);
      socket.off('tables_updated');
      socket.off('new_order');
      socket.off('table_status_updated');
      socket.off('leave_status_updated', handleLeaveStatusUpdated);
    };
  }, [socket]);

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

  // Data Fetching Functions
  const fetchOrders = async () => {
    try {
      const res = await waiterApi.get('/waiter/orders?all=true');
      setOrders(res.data.data);
    } catch (err) {
      console.log('Failed to fetch waiter active orders');
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await waiterApi.get('/waiter/attendance');
      setAttendance(res.data.data);

      // Check if clocked in today
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayRecord = res.data.data.find(a => new Date(a.date).toISOString().slice(0, 10) === todayStr);
      setCurrentAttendance(todayRecord || null);
    } catch (err) {
      console.log('Failed to fetch attendance history');
    }
  };

  const fetchLeaveData = async () => {
    try {
      const history = await waiterApi.get('/waiter/leaves');
      setLeaves(history.data.data);

      const bal = await waiterApi.get('/waiter/leaves/balance');
      setLeaveBalance(bal.data.data);
    } catch (err) {
      console.log('Failed to fetch leave details');
    }
  };

  const fetchPayroll = async () => {
    try {
      const res = await waiterApi.get('/waiter/payroll');
      setPayrolls(res.data.data);
    } catch (err) {
      console.log('Failed to fetch payroll information');
    }
  };

  const fetchWaiters = async () => {
    try {
      const res = await waiterApi.get('/waiter/list');
      if (res.data.data && res.data.data.length > 0) {
        setWaitersList(res.data.data.map(w => ({ id: w._id, name: w.name })));
      } else {
        setWaitersList([
          { id: waiter?._id || '1', name: waiter?.name || 'Current Waiter' }
        ]);
      }
    } catch (err) {
      console.log('Failed to fetch waiters directory');
    }
  };

  // Clock Actions
  const handleClockIn = async () => {
    setLoading(true);
    try {
      const res = await waiterApi.post('/waiter/attendance/clock-in');
      toast.success('Successfully clocked in for shift! ☕');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const res = await waiterApi.post('/waiter/attendance/clock-out');
      toast.success('Shift completed. Successfully clocked out! 👋');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock out failed');
    } finally {
      setLoading(false);
    }
  };

  // Leave Actions
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return toast.error('Please fill all fields');
    }
    setLoading(true);
    try {
      await waiterApi.post('/waiter/leaves', leaveForm);
      toast.success('Leave applied. Pending Admin approval! 📅');
      setIsLeaveModalOpen(false);
      setLeaveForm({ startDate: '', endDate: '', type: 'Sick', reason: '' });
      fetchLeaveData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setLoading(false);
    }
  };

  // Order & Item Cancellation
  const triggerCancelOrder = (orderId) => {
    setCancelContext({ orderId, itemId: null });
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const triggerCancelItem = (orderId, itemId) => {
    setCancelContext({ orderId, itemId });
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancellation = async () => {
    if (!cancelReason.trim()) return toast.error('Cancellation reason is required');
    setLoading(true);
    try {
      const { orderId, itemId } = cancelContext;
      if (itemId) {
        // Cancel single item
        await waiterApi.patch(`/orders/${orderId}/items/${itemId}/cancel`, { reason: cancelReason });
        toast.success('Item cancelled successfully');
      } else {
        // Cancel entire order
        await waiterApi.patch(`/orders/${orderId}/cancel`, { reason: cancelReason });
        toast.success('Order cancelled successfully');
      }
      setCancelModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setLoading(false);
    }
  };

  // Waiter Order Transfer
  const triggerTransferOrder = (order) => {
    setTransferContext(order);
    setSelectedTransferWaiterId('');
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTransferWaiterId) return toast.error('Please select a waiter');
    setLoading(true);
    try {
      await waiterApi.post(`/orders/${transferContext._id}/transfer-waiter`, { newWaiterId: selectedTransferWaiterId });
      toast.success('Order transferred successfully!');
      setTransferModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // Split Billing
  const triggerSplitBill = (order) => {
    setSplitContext(order);
    setSplitCount(2);
    setSplitModalOpen(true);
  };

  const handleConfirmSplit = async () => {
    setLoading(true);
    try {
      await waiterApi.post(`/orders/${splitContext._id}/split-bill`, { count: splitCount });
      toast.success(`Bill split successfully into ${splitCount} parts! 💳`);
      setSplitModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to split bill');
    } finally {
      setLoading(false);
    }
  };

  // Print & PDF Downloads
  const downloadPayslipPDF = (payroll) => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('VYAVASTHA RESTAURANT OS', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Employee Salary Payslip', 105, 30, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Waiter Name: ${waiter?.name || 'N/A'}`, 20, 50);
    doc.text(`Email Address: ${waiter?.email || 'N/A'}`, 20, 57);
    doc.text(`Salary Period: ${payroll.month}`, 20, 64);
    
    doc.line(20, 72, 190, 72);
    
    doc.text(`Working Days Count: ${payroll.workingDays}`, 20, 82);
    doc.text(`Base Salary: ${formatCurrencyPDF(payroll.baseSalary, currencyCode)}`, 20, 89);
    doc.text(`Overtime Hours: ${payroll.overtimeHours} hrs (${formatCurrencyPDF(payroll.overtimePay, currencyCode)})`, 20, 96);
    doc.text(`Shift Incentives: ${formatCurrencyPDF(payroll.incentives, currencyCode)}`, 20, 103);
    doc.text(`Salary Deductions: ${formatCurrencyPDF(payroll.deductions, currencyCode)}`, 20, 110);
    
    doc.line(20, 118, 190, 118);
    
    doc.setFont('Helvetica', 'bold');
    doc.text(`Net Take-Home Salary: ${formatCurrencyPDF(payroll.netSalary, currencyCode)}`, 20, 128);
    doc.text(`Payment Status: ${payroll.status}`, 20, 135);
    
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Generated electronically. Signature not required.', 105, 160, { align: 'center' });
    
    doc.save(`Payslip_${waiter?.name}_${payroll.month}.pdf`);
    toast.success('Payslip downloaded as PDF!');
  };

  const handlePrintReceipt = (receipt) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Order #${receipt._id.substring(receipt._id.length - 6)}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; width: 300px; margin: 0 auto; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; text-align: left; font-size: 12px; }
            .header-info { font-size: 12px; margin-bottom: 10px; line-height: 1.4; }
            .footer { margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="text-center">
            <h3>${waiter?.restaurantName || 'Vyavastha Bistro'}</h3>
            <div class="header-info">
              Branch: ${waiter?.branchName || 'Main Office'}<br/>
              GSTIN: 27AAAAA1111A1Z1
            </div>
          </div>
          <div class="divider"></div>
          <div class="header-info">
            <strong>Table:</strong> ${receipt.tableNumber}<br/>
            <strong>Waiter:</strong> ${waiter?.name}<br/>
            <strong>Date:</strong> ${new Date(receipt.createdAt).toLocaleDateString()}<br/>
            <strong>Time:</strong> ${new Date(receipt.createdAt).toLocaleTimeString()}<br/>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.price, currencyCode)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="text-right" style="font-size: 12px;">
            <p>Subtotal: ${formatCurrency(receipt.subtotal, currencyCode)}</p>
            <p>Taxes (8%): ${formatCurrency(receipt.tax, currencyCode)}</p>
            <h4 class="bold">Total: ${formatCurrency(receipt.total, currencyCode)}</h4>
          </div>
          <div class="divider"></div>
          <div class="text-center footer">
            Thank you for dining with us!<br/>
            Vyavastha POS ROS
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadReceiptPDF = (receipt) => {
    const doc = new jsPDF({ format: [80, 150] }); // POS paper size (80mm width)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(waiter?.restaurantName || 'Vyavastha Bistro', 40, 15, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Branch: ${waiter?.branchName || 'Main Office'}`, 40, 20, { align: 'center' });
    doc.text('GSTIN: 27AAAAA1111A1Z1', 40, 24, { align: 'center' });

    doc.line(10, 28, 70, 28);

    doc.text(`Table: ${receipt.tableNumber}`, 10, 34);
    doc.text(`Waiter: ${waiter?.name}`, 10, 39);
    doc.text(`Date: ${new Date(receipt.createdAt).toLocaleDateString()}`, 10, 44);

    doc.line(10, 48, 70, 48);

    let y = 54;
    doc.setFont('Helvetica', 'bold');
    doc.text('Item', 10, y);
    doc.text('Qty', 45, y);
    doc.text('Price', 60, y);
    doc.setFont('Helvetica', 'normal');

    y += 5;
    receipt.items.forEach(item => {
      doc.text(item.name.substring(0, 18), 10, y);
      doc.text(String(item.quantity), 46, y);
      doc.text(formatCurrencyPDF(item.price, currencyCode), 60, y);
      y += 5;
    });

    doc.line(10, y, 70, y);
    y += 5;
    doc.text(`Subtotal: ${formatCurrencyPDF(receipt.subtotal, currencyCode)}`, 40, y);
    y += 4;
    doc.text(`Tax (8%): ${formatCurrencyPDF(receipt.tax, currencyCode)}`, 40, y);
    y += 5;
    doc.setFont('Helvetica', 'bold');
    doc.text(`Total: ${formatCurrencyPDF(receipt.total, currencyCode)}`, 40, y);

    y += 10;
    doc.setFont('Helvetica', 'italic');
    doc.text('Thank you!', 40, y, { align: 'center' });

    doc.save(`Receipt_Table_${receipt.tableNumber}.pdf`);
    toast.success('Receipt downloaded as PDF!');
  };

  const shareReceipt = (receipt) => {
    if (navigator.share) {
      navigator.share({
        title: `Bill Table ${receipt.tableNumber}`,
        text: `Check out receipt for Table ${receipt.tableNumber} totaling ${formatCurrency(receipt.total, currencyCode)}`,
        url: window.location.href
      }).then(() => {
        toast.success('Shared successfully!');
      }).catch((e) => {
        console.log('Share cancelled', e);
      });
    } else {
      // Mock share copy to clipboard
      navigator.clipboard.writeText(`Receipt Link: Table ${receipt.tableNumber} - Total: ${formatCurrency(receipt.total, currencyCode)}`);
      toast.success('Receipt details copied to clipboard!');
    }
  };

  // Helper: Live cooking duration calculator
  const getPrepDuration = (preparingAt) => {
    if (!preparingAt) return '0m';
    const diffMs = timeTick - new Date(preparingAt).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins}m ago`;
  };

  // Render Subviews based on tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Quick Shift Tracker Banner */}
            <div className="bg-gradient-to-r from-brand-700 to-indigo-850 p-4 sm:p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-brand-500/10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl shadow-inner border border-white/10">
                  👋
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-heading">Welcome back, {waiter?.name || 'Waiter'}!</h2>
                  <p className="text-xs text-brand-200 mt-0.5">Let's coordinate operations and delight our guests today.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {currentAttendance?.clockIn ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      On Shift
                    </span>
                    <button
                      onClick={handleClockOut}
                      disabled={loading}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white text-sm font-bold font-heading rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Clock Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                      Off Duty
                    </span>
                    <button
                      onClick={handleClockIn}
                      disabled={loading}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-sm font-bold font-heading rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Clock In
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tables Area */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                Dine-In Layout Overview
              </h3>
              <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-xl p-4 sm:p-6 backdrop-blur-md">
                <TableManagement socket={socket} />
              </div>
            </div>
          </div>
        );

      case 'live-orders':
        const preparingOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status));
        const readyOrders = orders.filter(o => ['ready', 'billing'].includes(o.status));
        const displayedLiveOrders = liveOrdersSubTab === 'preparing' ? preparingOrders : readyOrders;

        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                  Branch Live Active Tickets
                </h3>
                <p className="text-xs text-dark-400 ml-4">Monitor in-preparation orders and serve ready orders</p>
              </div>
              <button onClick={fetchOrders} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors w-fit self-end sm:self-auto">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs switcher */}
            <div className="flex gap-2 p-1.5 bg-dark-100 dark:bg-dark-850 rounded-2xl w-fit border border-dark-200/60 dark:border-dark-800 shadow-inner">
              <button
                onClick={() => setLiveOrdersSubTab('preparing')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  liveOrdersSubTab === 'preparing'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-dark-500 hover:text-dark-900 dark:hover:text-white hover:bg-dark-250/20 dark:hover:bg-dark-800/40'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Preparing ({preparingOrders.length})</span>
              </button>
              <button
                onClick={() => setLiveOrdersSubTab('ready')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  liveOrdersSubTab === 'ready'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-dark-500 hover:text-dark-900 dark:hover:text-white hover:bg-dark-250/20 dark:hover:bg-dark-800/40'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Ready to Serve ({readyOrders.length})</span>
              </button>
            </div>

            {displayedLiveOrders.length === 0 ? (
              <div className="bg-white dark:bg-dark-850 rounded-2xl border border-dark-200 dark:border-dark-800 p-12 text-center text-dark-400">
                {liveOrdersSubTab === 'preparing'
                  ? 'No active orders in preparation at the moment. Take orders by selecting a table on the dashboard!'
                  : 'No tickets ready to be served yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveOrdersSubTab === 'preparing' ? (
                  preparingOrders.map(order => {
                    const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                    const isLocked = ['billing', 'completed', 'cancelled'].includes(order.status);
                    return (
                      <div
                        key={order._id}
                        className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden group"
                      >
                        {/* Priority Tag */}
                        <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-brand-500 to-indigo-600"></div>

                        <div className="flex justify-between items-start pt-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold font-heading text-dark-900 dark:text-white">
                                {order.tableNumber.toLowerCase().startsWith('table') ? order.tableNumber : `Table ${order.tableNumber}`}
                              </span>
                              <span className="text-xs bg-dark-100 dark:bg-dark-800 px-2 py-0.5 rounded text-dark-400 font-mono">
                                #{displayId}
                              </span>
                            </div>
                            <span className="text-xs text-dark-400">
                              Created: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full ${
                            order.status === 'preparing'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-dark-500/20 text-dark-400 border border-dark-600/30'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="border-t border-b border-dark-100 dark:border-dark-800 py-3 space-y-2 max-h-48 overflow-y-auto">
                          {order.items.map((item, idx) => (
                            <div key={item._id || idx} className="flex justify-between text-sm items-start gap-2">
                              <div>
                                <p className="font-semibold text-dark-900 dark:text-white">
                                  {item.quantity}x {item.name}
                                </p>
                                {item.notes && (
                                  <p className="text-[11px] text-brand-400 italic">Instruction: {item.notes}</p>
                                )}
                                {item.cancellationReason && (
                                  <p className="text-[11px] text-rose-400 italic">Cancelled: {item.cancellationReason}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-dark-500">
                                  {formatCurrency(item.subtotal, currencyCode)}
                                </span>
                                {!isLocked && item.status === 'pending' && (
                                  <button
                                    onClick={() => triggerCancelItem(order._id, item._id)}
                                    className="text-rose-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10"
                                    title="Cancel Item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Summary */}
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-dark-400">Grand Total</span>
                          <span className="text-brand-650 dark:text-brand-400 text-base font-bold font-heading">
                            {formatCurrency(order.total, currencyCode)}
                          </span>
                        </div>

                        {/* Action Triggers */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {isLocked ? (
                            <div className="col-span-2 text-center py-2 bg-dark-100 dark:bg-dark-800 rounded-xl text-xs text-dark-400 border border-dark-200 dark:border-dark-800 flex items-center justify-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              Modifications Locked (Cooking/Ready)
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => navigate(`/waiter/order/${order.tableId || order._id}`)}
                                className="py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                              >
                                Edit Order
                              </button>
                              <button
                                onClick={() => triggerCancelOrder(order._id)}
                                className="py-2.5 bg-rose-600/15 hover:bg-rose-600 text-rose-500 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-rose-500/20"
                              >
                                Cancel Ticket
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => triggerTransferOrder(order)}
                            className="py-2.5 bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-dark-800 dark:text-dark-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-dark-200 dark:border-dark-800"
                          >
                            Transfer Waiter
                          </button>
                          <button
                            onClick={() => triggerSplitBill(order)}
                            className="py-2.5 bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-dark-800 dark:text-dark-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-dark-200 dark:border-dark-800"
                          >
                            Split Bill
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  readyOrders.map(order => {
                    const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                    return (
                      <div
                        key={order._id}
                        className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4 cursor-pointer hover:border-brand-500/30 transition-all"
                        onClick={() => setSelectedOrderForReceipt(order)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-base text-dark-900 dark:text-white">
                              {order.tableNumber.toLowerCase().startsWith('table') ? order.tableNumber : `Table ${order.tableNumber}`}
                            </p>
                            <span className="text-xs text-dark-400 font-mono">#{displayId}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {order.status}
                          </span>
                        </div>

                        <div className="text-xs text-dark-450 border-t border-dark-200 dark:border-dark-800 pt-3">
                          <p>Items Count: {order.items?.length || 0}</p>
                          <p>Total bill: {formatCurrency(order.total, currencyCode)}</p>
                          <p className="mt-1">Date: {new Date(order.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="flex gap-2 justify-end mt-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handlePrintReceipt(order)}
                            className="p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg hover:shadow transition-colors"
                            title="Print POS slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadReceiptPDF(order)}
                            className="p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg hover:shadow transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => shareReceipt(order)}
                            className="p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg hover:shadow transition-colors"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );

      case 'order-history':
        const filteredHistory = orders.filter(o => {
          if (!['completed', 'cancelled'].includes(o.status)) return false;
          
          const orderDate = new Date(o.createdAt);
          const today = new Date();
          
          if (historyFilter === 'day') {
            return orderDate.toDateString() === today.toDateString();
          } else if (historyFilter === 'month') {
            return orderDate.getMonth() === today.getMonth() && 
                   orderDate.getFullYear() === today.getFullYear();
          } else if (historyFilter === 'year') {
            return orderDate.getFullYear() === today.getFullYear();
          }
          return true; // 'all'
        });

        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-200 dark:border-dark-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                  Archived Ticket Logs ({filteredHistory.length})
                </h3>
                <p className="text-xs text-dark-400 ml-4">View and retrieve receipts for past completed and cancelled orders</p>
              </div>

              {/* Filter Selector */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-dark-100 dark:bg-dark-850 rounded-xl border border-dark-200 dark:border-dark-800 w-fit shadow-inner">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'day', label: 'Today' },
                  { id: 'month', label: 'This Month' },
                  { id: 'year', label: 'This Year' }
                ].map(filterOpt => (
                  <button
                    key={filterOpt.id}
                    onClick={() => setHistoryFilter(filterOpt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      historyFilter === filterOpt.id
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-dark-500 hover:text-dark-900 dark:hover:text-white hover:bg-dark-200/40 dark:hover:bg-dark-800/40'
                    }`}
                  >
                    {filterOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="bg-white dark:bg-dark-850 rounded-2xl border border-dark-200 dark:border-dark-800 p-12 text-center text-dark-400">
                No orders found under this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.map(order => {
                  const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                  return (
                    <div
                      key={order._id}
                      className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4 cursor-pointer hover:border-brand-500/30 transition-all"
                      onClick={() => setSelectedOrderForReceipt(order)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-base text-dark-900 dark:text-white">
                            {order.tableNumber.toLowerCase().startsWith('table') ? order.tableNumber : `Table ${order.tableNumber}`}
                          </p>
                          <span className="text-xs text-dark-400 font-mono">#{displayId}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full ${
                          order.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="text-xs text-dark-450 border-t border-dark-200 dark:border-dark-800 pt-3">
                        <p>Items Count: {order.items?.length || 0}</p>
                        <p>Total bill: {formatCurrency(order.total, currencyCode)}</p>
                        <p className="mt-1">Date: {new Date(order.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="flex gap-2 justify-end mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handlePrintReceipt(order)}
                          className="p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg hover:shadow"
                          title="Print POS slip"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadReceiptPDF(order)}
                          className="p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg hover:shadow"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => shareReceipt(order)}
                          className="p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg hover:shadow"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'leave-management':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
            {/* Balance Card Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-500/10 text-brand-500 rounded-full w-24 h-24 flex items-center justify-center translate-x-6 -translate-y-6 text-5xl">
                  📅
                </div>
                <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white mb-6">Leave Allocations</h4>
                <div className="space-y-4">
                  {Object.entries(leaveBalance).map(([key, bal]) => (
                    <div key={key} className="p-3.5 bg-dark-50 dark:bg-dark-800 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-dark-900 dark:text-white capitalize">{key} Leave</p>
                        <p className="text-[11px] text-dark-400 mt-0.5">Allocated: {bal.allocated} days</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-brand-650 dark:text-brand-400">{bal.remaining}</span>
                        <span className="text-xs text-dark-450"> left</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg transition-colors cursor-pointer font-heading flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Apply New Leave
              </button>
            </div>

            {/* Leave History Column */}
            <div className="lg:col-span-2 bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 p-6 shadow-xl space-y-6">
              <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                Applied Leave Requests
              </h4>
              {leaves.length === 0 ? (
                <div className="text-center py-12 text-dark-400">No leave requests found.</div>
              ) : (
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {leaves.map(leave => (
                    <div
                      key={leave._id}
                      className="p-4 bg-dark-50 dark:bg-dark-800 border border-dark-250 dark:border-dark-750/30 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-brand-500/20 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-dark-900 dark:text-white capitalize">
                            {leave.type} Leave
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            leave.status === 'Approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : leave.status === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {leave.status === 'Approved' ? 'Granted & Approved' : leave.status === 'Pending' ? 'Pending Admin Approval' : 'Rejected'}
                          </span>
                        </div>
                        <p className="text-xs text-dark-400 mt-1">
                          Period: {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        {leave.reason && (
                          <p className="text-xs text-dark-500 mt-1.5 italic">Reason: "{leave.reason}"</p>
                        )}
                        {leave.adminRemarks && (
                          <p className="text-xs text-brand-400 mt-1">Remarks: "{leave.adminRemarks}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'payroll':
        return (
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white flex items-center gap-2 border-l-4 border-brand-500 pl-3">
              Salary Payroll History
            </h3>
            {payrolls.length === 0 ? (
              <div className="text-center py-12 text-dark-400">No payroll records logged.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b border-dark-200 dark:border-dark-800 text-xs text-dark-400 uppercase tracking-widest font-bold">
                      <th className="pb-3">Month</th>
                      <th className="pb-3">Work Days</th>
                      <th className="pb-3">Base Salary</th>
                      <th className="pb-3">Overtime Hours</th>
                      <th className="pb-3">Incentives</th>
                      <th className="pb-3">Deductions</th>
                      <th className="pb-3">Net Payout</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-200 dark:divide-dark-800 text-sm">
                    {payrolls.map((payroll, idx) => (
                      <tr key={payroll._id || idx} className="text-dark-800 dark:text-dark-100 hover:bg-dark-50 dark:hover:bg-dark-800/30">
                        <td className="py-4.5 font-semibold">{payroll.month}</td>
                        <td className="py-4.5">{payroll.workingDays} days</td>
                        <td className="py-4.5 font-medium">{formatCurrency(payroll.baseSalary, currencyCode)}</td>
                        <td className="py-4.5">{payroll.overtimeHours} hrs</td>
                        <td className="py-4.5 text-emerald-500">+{formatCurrency(payroll.incentives, currencyCode)}</td>
                        <td className="py-4.5 text-rose-500">-{formatCurrency(payroll.deductions, currencyCode)}</td>
                        <td className="py-4.5 font-bold text-dark-900 dark:text-white">
                          {formatCurrency(payroll.netSalary, currencyCode)}
                        </td>
                        <td className="py-4.5">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            payroll.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {payroll.status}
                          </span>
                        </td>
                        <td className="py-4.5 text-right">
                          <button
                            onClick={() => navigate(`/waiter/payslip/${payroll._id || 'mock'}`)}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5 text-xs font-bold transition-all hover:shadow cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'notifications':
        return (
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white border-l-4 border-brand-500 pl-3">
              Announcements & Alerts Feed
            </h3>
            {/* Mock notifications for reference */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {[
                { title: 'Shift Allocation Confirmed', msg: 'Admin updated your shift rosters for July 2026.', type: 'info', time: '1 hr ago' },
                { title: 'Salary Credited', msg: 'Your net take-home salary for June 2026 has been processed.', type: 'success', time: '1 day ago' },
                { title: 'Leave Application Approved', msg: 'Your sick leave request for 23rd July has been approved.', type: 'success', time: '2 days ago' }
              ].map((notif, idx) => (
                <div key={idx} className="p-4 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750/30 rounded-2xl flex justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-dark-900 dark:text-white">{notif.title}</h5>
                    <p className="text-xs text-dark-400 mt-1">{notif.msg}</p>
                  </div>
                  <span className="text-[10px] text-dark-450 whitespace-nowrap">{notif.time}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        const handlePhotoUpload = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setProfileForm((prev) => ({
                ...prev,
                profilePhoto: reader.result
              }));
            };
            reader.readAsDataURL(file);
          }
        };

        const handleSaveProfile = async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const payload = {
              name: profileForm.name,
              phone: profileForm.phone,
              dob: profileForm.dob || null,
              profilePhoto: profileForm.profilePhoto
            };
            if (profileForm.password) {
              payload.password = profileForm.password;
            }

            const res = await waiterApi.put('/waiter/profile', payload);
            updateLocalProfile(res.data.data);
            toast.success('Profile updated successfully!');
            setProfileForm((prev) => ({ ...prev, password: '' }));
          } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
          } finally {
            setLoading(false);
          }
        };

        return (
          <div className="max-w-xl mx-auto space-y-6">
            {/* Profile Editing Card */}
            <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 p-6 shadow-xl animate-in fade-in duration-200">
              <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white border-l-4 border-brand-500 pl-3 mb-6">
                My Profile Settings
              </h3>
              
              <form onSubmit={handleSaveProfile} className="space-y-5 text-left">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="relative group">
                    {profileForm.profilePhoto ? (
                      <img
                        src={profileForm.profilePhoto}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-2 border-brand-500 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-brand-600/10 rounded-full flex items-center justify-center text-4xl text-brand-650 font-bold border border-brand-500/20 shadow-inner">
                        {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'W'}
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-bold rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {profileForm.profilePhoto && (
                    <button
                      type="button"
                      onClick={() => setProfileForm((prev) => ({ ...prev, profilePhoto: '' }))}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-400 uppercase mb-1.5">Waiter Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full h-10 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-400 uppercase mb-1.5">Registered Email (Read-Only)</label>
                    <input
                      type="email"
                      disabled
                      value={waiter?.email || ''}
                      className="w-full h-10 rounded-lg border border-dark-200 dark:border-dark-800 bg-dark-50 dark:bg-dark-850 px-3 py-2 text-sm text-dark-455 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-400 uppercase mb-1.5">Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full h-10 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-400 uppercase mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dob}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, dob: e.target.value }))}
                      className="w-full h-10 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-400 uppercase mb-1.5">Change Password (Leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="New password (min 6 characters)"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 text-white font-bold font-heading rounded-lg shadow-md transition-all cursor-pointer text-sm"
                  >
                    {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Application Configuration Card */}
            <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 p-6 shadow-xl animate-in fade-in duration-200">
              <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white border-l-4 border-brand-500 pl-3 mb-6">
                Application Preferences
              </h3>
              <div className="flex justify-between items-center p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750">
                <div>
                  <p className="text-sm font-bold text-dark-900 dark:text-white">Dark Display Mode</p>
                  <p className="text-xs text-dark-400 mt-0.5">Toggle interface design palette preference</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2.5 bg-white dark:bg-dark-900 hover:bg-dark-50 dark:hover:bg-dark-800 text-dark-900 dark:text-white rounded-xl shadow-md border border-dark-200 dark:border-dark-850 transition-all cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'live-orders', label: 'Live Orders', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'order-history', label: 'Ticket History', icon: <History className="w-5 h-5" /> },
    { id: 'leave-management', label: 'Leaves', icon: <Calendar className="w-5 h-5" /> },
    { id: 'payroll', label: 'Payroll Logs', icon: <IndianRupee className="w-5 h-5" /> },
    { id: 'notifications', label: 'Alerts Feed', icon: <Bell className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950 text-dark-900 dark:text-white flex flex-col lg:flex-row transition-colors duration-200">
      
      {/* Top navbar on mobile, hidden on large screens */}
      <header className="bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-b border-dark-200 dark:border-dark-850 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 lg:hidden w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-600/10 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-brand-600" />
          </div>
          <span className="font-bold text-base font-heading tracking-tight truncate max-w-[180px]">
            {waiter?.restaurantName || 'Vyavastha'} Waiter
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-dark-400 hover:text-white rounded-xl hover:bg-dark-800 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Responsive Sidebar */}
      <aside className={`bg-white dark:bg-dark-900 border-r border-dark-200 dark:border-dark-850 fixed left-0 top-0 h-screen transition-all duration-300 flex flex-col justify-between z-30 w-64 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Sidebar Header (Logo & Restaurant Name) */}
        <div className="p-6 border-b border-dark-100 dark:border-dark-850/50 flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 bg-brand-600/10 rounded-2xl flex items-center justify-center text-brand-650 dark:text-brand-400">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-dark-900 dark:text-white truncate font-heading tracking-tight">
              {waiter?.restaurantName || 'Vyavastha'}
            </span>
            <span className="text-2xs text-dark-400 font-medium">
              Waiter Console
            </span>
          </div>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center space-x-3.5 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-650 dark:text-brand-400 shadow-sm border border-brand-500/10'
                    : 'text-dark-500 hover:bg-dark-50 dark:hover:bg-dark-800/40 hover:text-dark-900 dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-dark-100 dark:border-dark-800 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3.5 w-full px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Mobile menu backdrop blur */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto lg:ml-64 mt-0 lg:mt-0 max-w-7xl mx-auto w-full">
        {renderTabContent()}
      </main>

      {/* 1. Real-time Order Ready Modal Overlay */}
      {readyAlert && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setReadyAlert(null)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-dark-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                🛎️
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark-900 dark:text-white font-heading">Order is Ready!</h3>
                <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">
                  The kitchen staff finished preparing the dishes for:
                </p>
                <div className="mt-3 py-2.5 px-6 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl inline-block text-lg font-heading">
                  {readyAlert.tableNumber}
                </div>
              </div>
              <button
                onClick={() => setReadyAlert(null)}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md transition-colors duration-150 cursor-pointer font-heading"
              >
                Okay, I'll serve it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cancellation Reason Popup Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white mb-4">
              {cancelContext.itemId ? 'Cancel Menu Item' : 'Cancel Entire Order'}
            </h4>
            <div className="space-y-4">
              <p className="text-sm text-dark-400">Please provide a reason for cancelling this order item.</p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g., Guest changed mind, Out of stock"
                className="w-full p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
                rows={3}
              />
              <button
                onClick={handleConfirmCancellation}
                disabled={loading}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold font-heading rounded-xl shadow transition-colors cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Waiter Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setTransferModalOpen(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white mb-4">
              Transfer Table Order
            </h4>
            <div className="space-y-4">
              <p className="text-sm text-dark-400">Transfer order for table {transferContext?.tableNumber} to another waiter.</p>
              <select
                value={selectedTransferWaiterId}
                onChange={e => setSelectedTransferWaiterId(e.target.value)}
                className="w-full p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Waiter...</option>
                {waitersList.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <button
                onClick={handleConfirmTransfer}
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold font-heading rounded-xl shadow transition-colors cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Split Billing Modal */}
      {splitModalOpen && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setSplitModalOpen(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white mb-4">
              Split Billing (Equal Split)
            </h4>
            <div className="space-y-4">
              <p className="text-sm text-dark-400">Enter number of guests to split the bill total equally.</p>
              <input
                type="number"
                min="2"
                max="20"
                value={splitCount}
                onChange={e => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-full p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
              />
              {splitContext && (
                <p className="text-xs text-dark-400 font-semibold text-right">
                  Each pays: {formatCurrency(splitContext.total / splitCount, currencyCode)}
                </p>
              )}
              <button
                onClick={handleConfirmSplit}
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold font-heading rounded-xl shadow transition-colors cursor-pointer"
              >
                Generate Split Bills
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Apply Leave Form Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsLeaveModalOpen(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white mb-4">
              Apply Leave Request
            </h4>
            <form onSubmit={handleApplyLeave} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-dark-400 block mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.startDate}
                  onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="w-full p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-400 block mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.endDate}
                  onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="w-full p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-400 block mb-1">Leave Type</label>
                <select
                  value={leaveForm.type}
                  onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  className="w-full p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
                >
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Earned">Earned Leave</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-400 block mb-1">Reason Description</label>
                <textarea
                  required
                  placeholder="Please state details..."
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-750 text-sm rounded-xl focus:border-brand-500 focus:outline-none"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold font-heading rounded-xl shadow transition-colors cursor-pointer"
              >
                Submit Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Receipt Viewer Dialog */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-dark-850 rounded-3xl border border-dark-200 dark:border-dark-800 shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setSelectedOrderForReceipt(null)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold font-heading text-dark-900 dark:text-white mb-4">
              POS Receipt Preview
            </h4>
            <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dashed border-dark-300 dark:border-dark-700 text-left font-mono text-xs space-y-4 max-h-[300px] overflow-y-auto">
              <div className="text-center">
                <p className="font-bold text-sm">{waiter?.restaurantName || 'Vyavastha Bistro'}</p>
                <p>GSTIN: 27AAAAA1111A1Z1</p>
              </div>
              <div className="divider border-b border-dashed border-dark-300 dark:border-dark-700"></div>
              <div>
                <p>Table: {selectedOrderForReceipt.tableNumber}</p>
                <p>Waiter: {waiter?.name}</p>
                <p>Date: {new Date(selectedOrderForReceipt.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="divider border-b border-dashed border-dark-300 dark:border-dark-700"></div>
              <div className="space-y-1">
                {selectedOrderForReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.subtotal, currencyCode)}</span>
                  </div>
                ))}
              </div>
              <div className="divider border-b border-dashed border-dark-300 dark:border-dark-700"></div>
              <div className="text-right space-y-1 font-bold">
                <p>Subtotal: {formatCurrency(selectedOrderForReceipt.subtotal, currencyCode)}</p>
                <p>Taxes (8%): {formatCurrency(selectedOrderForReceipt.tax, currencyCode)}</p>
                <p className="text-sm">Total: {formatCurrency(selectedOrderForReceipt.total, currencyCode)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => handlePrintReceipt(selectedOrderForReceipt)}
                className="py-2.5 bg-dark-100 hover:bg-dark-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-dark-800 dark:text-dark-100 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer border border-dark-200 dark:border-dark-800"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => downloadReceiptPDF(selectedOrderForReceipt)}
                className="py-2.5 bg-dark-100 hover:bg-dark-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-dark-800 dark:text-dark-100 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer border border-dark-200 dark:border-dark-800"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => shareReceipt(selectedOrderForReceipt)}
                className="py-2.5 bg-dark-100 hover:bg-dark-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-dark-800 dark:text-dark-100 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer border border-dark-200 dark:border-dark-800"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WaiterDashboard;
