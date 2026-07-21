import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useWaiterAuth } from '../store/useWaiterAuth';
import { TableManagement } from '../components/TableManagement';
import { LogOut, User, LayoutDashboard, Clock, Sun, Moon } from 'lucide-react';
import { getSocket, disconnectSocket } from '@/socket/socketClient';

export const WaiterDashboard = () => {
  const { waiter, logout } = useWaiterAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [socket, setSocket] = useState(null);
  const [readyAlert, setReadyAlert] = useState(null);

  useEffect(() => {
    if (!waiter || !waiter.branchId) return;

    const branchIdStr = waiter.branchId.toString();
    const socketInstance = getSocket(branchIdStr);

    setSocket(socketInstance);

    return () => {
      setSocket(null);
    };
  }, [waiter]);

  useEffect(() => {
    if (!socket) return;

    const handleOrderStatusUpdated = (data) => {
      if (data.status === 'ready') {
        const orderDisplayId = data.orderId ? data.orderId.substring(Math.max(0, data.orderId.length - 6)) : '';
        const tableStr = data.order && data.order.tableNumber ? (` for ${data.order.tableNumber.toLowerCase().startsWith('table') ? data.order.tableNumber : `Table ${data.order.tableNumber}`}`) : '';

        toast.success(`Order #${orderDisplayId}${tableStr} is Ready! 🍽️`, {
          duration: 8000,
          position: 'top-right',
          id: `order-ready-${data.orderId}`
        });

        setReadyAlert({
          orderId: data.orderId,
          tableNumber: data.order?.tableNumber || 'Unknown'
        });
      }
    };

    socket.on('order_status_updated', handleOrderStatusUpdated);

    return () => {
      socket.off('order_status_updated', handleOrderStatusUpdated);
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

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/waiter/login');
  };

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-900 text-dark-900 dark:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-dark-200 dark:border-dark-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-600/10 rounded-full flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold font-heading tracking-tight truncate max-w-[160px] xs:max-w-[220px] sm:max-w-none">
            {waiter?.restaurantName ? `${waiter.restaurantName} - Waiter` : 'Waiter Dashboard'}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2">
            <User className="w-5 h-5 text-dark-400" />
            <span className="font-medium text-dark-800 dark:text-dark-100">{waiter?.name || 'Waiter'}</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white transition-colors rounded-full hover:bg-dark-100 dark:hover:bg-dark-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 sm:gap-2 text-dark-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-8">

        {/* Quick Stats / Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-dark-850 p-4 sm:p-6 rounded-2xl border border-dark-200 dark:border-dark-800 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Current Session</p>
              <p className="text-base sm:text-xl font-bold text-dark-900 dark:text-white">
                {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Table Management Section */}
        <section className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold font-heading text-dark-900 dark:text-white">Table Overview</h3>
          </div>

          <div className="bg-white dark:bg-dark-850 rounded-2xl border border-dark-200 dark:border-dark-800 shadow-sm p-4 sm:p-6">
            <TableManagement socket={socket} />
          </div>
        </section>
      </main>

      {/* Real-time Order Ready Modal Overlay */}
      {readyAlert && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-850 rounded-2xl border border-dark-200 dark:border-dark-800 shadow-xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
            {/* Close Cross Button */}
            <button
              onClick={() => setReadyAlert(null)}
              className="absolute top-4 right-4 text-dark-400 hover:text-dark-600 dark:hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                  {readyAlert.tableNumber.toLowerCase().startsWith('table') ? readyAlert.tableNumber : `Table ${readyAlert.tableNumber}`}
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
    </div>
  );
};
