import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import Overview from '../components/Overview';
import OrdersManager from '@/features/live-orders/components/OrdersManager';
import { KdsView } from '@/features/live-orders/components/KdsView';
import MenuManager from '@/features/menu/components/MenuManager';
import TableManager from '@/features/tables/components/TableManager';
import StaffManager from '@/features/staff/components/StaffManager';
import InventoryManager from '@/features/inventory/components/InventoryManager';
import { getSocket } from '@/socket/socketClient';
import api from '@/api';

export const DashboardLayout = () => {
  const { isAuthenticated, currentRestaurant, currentBranch } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);

  const fetchPendingLeaves = async () => {
    try {
      const res = await api.get('/employees/leaves');
      const leaves = res.data.data || [];
      const count = leaves.filter(l => l.status === 'Pending').length;
      setPendingLeavesCount(count);
    } catch (err) {
      console.log('Failed to fetch pending leaves count for badge');
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentRestaurant) {
      fetchPendingLeaves();
    }
  }, [isAuthenticated, currentRestaurant, activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !currentRestaurant || !currentBranch) return;

    const branchIdStr = (currentBranch.id || currentBranch._id).toString();
    const socketInstance = getSocket(branchIdStr);

    const handleNewOrder = (newOrder) => {
      toast.success(`New Ticket Received: ${newOrder.tableNumber}`, {
        id: `new-order-${newOrder._id || newOrder.id}`
      });
    };

    socketInstance.on('new_order', handleNewOrder);

    setSocket(socketInstance);

    return () => {
      socketInstance.off('new_order', handleNewOrder);
      setSocket(null);
    };
  }, [isAuthenticated, currentRestaurant, currentBranch]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!currentRestaurant) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex flex-col transition-colors duration-200">
      {/* Topbar navigation Header */}
      <Topbar socket={socket} onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      {/* Mobile backdrop overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-dark-950/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 pt-16 h-screen overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
          pendingLeavesCount={pendingLeavesCount}
        />

        {/* Console Workspace viewport */}
        <main
          className={`flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto transition-all duration-300 ml-0 ${
            isCollapsed ? 'md:ml-16' : 'md:ml-64'
          }`}
        >
          {activeTab === 'overview' && <Overview setActiveTab={handleTabChange} />}
          {activeTab === 'orders' && <OrdersManager socket={socket} />}
          {activeTab === 'kds' && <KdsView socket={socket} />}
          {activeTab === 'menu' && <MenuManager />}
          {activeTab === 'tables' && <TableManager socket={socket} />}
          {activeTab === 'staff' && <StaffManager />}
          {activeTab === 'inventory' && <InventoryManager />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
