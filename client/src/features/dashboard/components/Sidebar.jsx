import React from 'react';
import { LayoutDashboard, ShoppingCart, BookOpen, Users, ClipboardList, LogOut, ChevronLeft, ChevronRight, Grid, ChefHat } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/useAuthStore';

export const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, pendingLeavesCount = 0 }) => {
  const { logout } = useAuthStore();

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'orders', label: 'Live Orders', icon: <ShoppingCart className="h-5 w-5" /> },
    { id: 'kds', label: 'Kitchen (KDS)', icon: <ChefHat className="h-5 w-5" /> },
    { id: 'menu', label: 'Menu Config', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'tables', label: 'Tables', icon: <Grid className="h-5 w-5" /> },
    { id: 'staff', label: 'Staff Directory', icon: <Users className="h-5 w-5" /> },
    { id: 'inventory', label: 'Inventory', icon: <ClipboardList className="h-5 w-5" /> }
  ];

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <aside
      className={cn(
        "bg-white dark:bg-dark-900 border-r border-dark-200 dark:border-dark-850 h-screen transition-all duration-300 flex flex-col justify-between fixed left-0 top-0 pt-16",
        // Mobile: hidden off-screen by default, slides in when open, always w-64
        isMobileOpen ? "translate-x-0 w-64 z-50" : "-translate-x-full md:translate-x-0 z-30",
        // Desktop: collapsed/expanded logic
        "md:w-64",
        isCollapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Sidebar Items */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer relative",
                isActive
                  ? "bg-brand-50 dark:bg-brand-950/40 text-brand-650 dark:text-brand-400"
                  : "text-dark-500 hover:bg-dark-50 dark:hover:bg-dark-800/50 hover:text-dark-900 dark:hover:text-white"
              )}
            >
              {item.icon}
              {/* On mobile when open, always show label. On desktop respect collapse */}
              {(isMobileOpen || !isCollapsed) ? (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.id === 'staff' && pendingLeavesCount > 0 && (
                    <span className="ml-2 bg-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse flex-shrink-0">
                      {pendingLeavesCount}
                    </span>
                  )}
                </div>
              ) : (
                item.id === 'staff' && pendingLeavesCount > 0 && (
                  <div className="absolute top-1.5 right-1.5 h-2 w-2 bg-amber-500 rounded-full border border-white dark:border-dark-900 animate-pulse" />
                )
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-dark-100 dark:border-dark-800 flex-shrink-0">
        <button
          onClick={logout}
          className={cn(
            "flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(isMobileOpen || !isCollapsed) && <span>Log Out</span>}
        </button>
      </div>

      {/* Toggle Button – desktop only */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 h-6 w-6 rounded-full border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 items-center justify-center cursor-pointer shadow-sm hover:bg-dark-50 dark:hover:bg-dark-800 z-10"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4 text-dark-500" /> : <ChevronLeft className="h-4 w-4 text-dark-500" />}
      </button>
    </aside>
  );
};

export default Sidebar;
